package pl.promasz.vizuapp;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * VizuApp na telefon: serwer VizuApp dziala na komputerze maszyny (PLC z Windows, port 8128), aplikacja pokazuje go
 * na pelnym ekranie. Ekran startowy (assets/start.html): maszyny z VizuApp znalezione w sieci telefonu (Wi-Fi / VPN,
 * /api/hello w podsieciach /24 kart sieciowych), adres reczny, nowa wersja aplikacji z GitHub Releases.
 * Ostatnia maszyna zapamietana - kolejne uruchomienie otwiera ja od razu. Wstecz na stronie glownej maszyny - ekran startowy.
 */
public class MainActivity extends Activity {
    static final String START = "file:///android_asset/start.html";
    static final int PORT = 8128;
    /** Symulator offline: wersja statyczna (scripts/build-pages.js) w assets/sim/, serwowana pod tym adresem. */
    static final String SIM_HOST = "sim.vizuapp.local";
    static final String SIM = "https://" + SIM_HOST + "/";
    /** Symulator z internetem: zawsze aktualny (GitHub Pages). */
    static final String SIM_ONLINE = "https://patrykchoinski.github.io/Promasz-Visu3D/";

    WebView web;
    SharedPreferences prefs;
    final Handler ui = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences("vizuapp", MODE_PRIVATE);
        web = new WebView(this);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setAllowFileAccess(true);
        s.setTextZoom(100);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                // maszyna nie odpowiada - ekran startowy z komunikatem
                if (req.isForMainFrame()) v.loadUrl(START + "#error");
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (!SIM_HOST.equals(u.getHost())) return null;
                String path = u.getPath() == null || u.getPath().equals("/") ? "/index.html" : u.getPath();
                try {
                    return new WebResourceResponse(mime(path), "utf-8", getAssets().open("sim" + path));
                } catch (Exception e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new java.util.HashMap<>(), null);
                }
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                if (url != null && url.startsWith("http:")) remember(url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                String scheme = u.getScheme();
                // pobranie nowej wersji (apk z GitHuba) i inne strony poza maszyna - w przegladarce
                if ("https".equals(scheme) && u.getHost() != null && u.getHost().endsWith("github.com")) {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                    return true;
                }
                return false;
            }
        });
        web.addJavascriptInterface(new Bridge(), "VizuAndroid");
        if (state != null) web.restoreState(state);
        else {
            String last = prefs.getString("url", null);
            web.loadUrl(last != null ? last : START);
        }
    }

    static String mime(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".webmanifest")) return "application/manifest+json";
        if (path.endsWith("/config") || path.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    /** Zapamietuje maszyne (ostatnia + lista znanych adresow do szukania w ich podsieciach). */
    void remember(String url) {
        Uri u = Uri.parse(url);
        if (!"http".equals(u.getScheme()) || u.getHost() == null) return;
        Set<String> known = new LinkedHashSet<>(prefs.getStringSet("known", new LinkedHashSet<>()));
        known.add(u.getHost());
        String base = u.getScheme() + "://" + u.getHost() + (u.getPort() > 0 ? ":" + u.getPort() : "") + "/";
        prefs.edit().putString("url", base).putStringSet("known", known).apply();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        String url = web.getUrl();
        if (url != null && url.startsWith("file:")) { super.onBackPressed(); return; }
        if (web.canGoBack()) web.goBack();
        else web.loadUrl(START);
    }

    /**
     * Adresy do sprawdzenia: podsieci /24 kart sieciowych telefonu (Wi-Fi, VPN) i maszyn otwieranych wczesniej
     * (VPN czesto daje telefonowi adres z innej podsieci niz maszyny, np. telefon 10.8.0.x, maszyny 10.12.0.x).
     */
    static List<String> hosts(Set<String> known) {
        Set<String> out = new LinkedHashSet<>();
        for (String k : known) {
            String[] p = k.split("\\.");
            if (p.length == 4) for (int i = 1; i < 255; i++) out.add(p[0] + "." + p[1] + "." + p[2] + "." + i);
        }
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) {
                    if (!(a instanceof Inet4Address) || a.isLinkLocalAddress()) continue;
                    byte[] b = a.getAddress();
                    String net = (b[0] & 255) + "." + (b[1] & 255) + "." + (b[2] & 255) + ".";
                    for (int i = 1; i < 255; i++) out.add(net + i);
                }
            }
        } catch (Exception ignored) { }
        return new ArrayList<>(out);
    }

    static String get(String url, int timeoutMs) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(timeoutMs);
        c.setReadTimeout(timeoutMs);
        c.setRequestProperty("User-Agent", "VizuApp-Android");
        try (InputStream in = c.getInputStream()) {
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) > 0 && bo.size() < 65536) bo.write(buf, 0, n);
            return bo.toString("UTF-8");
        } finally {
            c.disconnect();
        }
    }

    class Bridge {
        @JavascriptInterface
        public String version() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return "?"; }
        }

        @JavascriptInterface
        public String lastUrl() { return prefs.getString("url", ""); }

        /** Znacznik kodu aplikacji (android/ w repo): nowe APK tylko gdy sie zmienil (ekrany przychodza z serwera). */
        @JavascriptInterface
        public String shellHash() { return getString(R.string.shell_hash); }

        /** Otwiera maszyne i zapamietuje ja na nastepne uruchomienie. */
        @JavascriptInterface
        public void open(String url) {
            remember(url);
            ui.post(() -> web.loadUrl(url));
        }

        /** Symulator: z internetem - GitHub Pages (aktualny), bez - wbudowany w aplikacje. */
        @JavascriptInterface
        public void sim(boolean online) {
            ui.post(() -> web.loadUrl(online ? SIM_ONLINE : SIM));
        }

        @JavascriptInterface
        public void forget() { prefs.edit().remove("url").apply(); }

        /** Szukanie maszyn z VizuApp; wynik: window.onScan(JSON [{host, url, name, endpoint, connected}]). */
        @JavascriptInterface
        public void scan() {
            new Thread(() -> {
                List<String> hs = hosts(prefs.getStringSet("known", new LinkedHashSet<>()));
                JSONArray found = new JSONArray();
                ExecutorService pool = Executors.newFixedThreadPool(48);
                for (String h : hs) {
                    pool.submit(() -> {
                        try {
                            String url = "http://" + h + ":" + PORT + "/";
                            JSONObject o = new JSONObject(get(url + "api/hello", 1200));
                            if (!"VizuApp".equals(o.optString("app"))) return;
                            JSONObject r = new JSONObject();
                            r.put("host", h).put("url", url).put("name", o.optString("name"))
                                .put("endpoint", o.optString("endpoint")).put("connected", o.optBoolean("connected"));
                            synchronized (found) { found.put(r); }
                        } catch (Exception ignored) { }
                    });
                }
                pool.shutdown();
                try { pool.awaitTermination(30, TimeUnit.SECONDS); } catch (InterruptedException ignored) { }
                // maszyny znalezione przez serwery VizuApp (kazdy skanuje swoje podsieci - /api/hosts)
                Set<String> seen = new LinkedHashSet<>();
                for (int i = 0; i < found.length(); i++) seen.add(found.optJSONObject(i).optString("name"));
                int n0 = found.length();
                for (int i = 0; i < n0; i++) {
                    try {
                        JSONArray more = new JSONObject(get(found.getJSONObject(i).getString("url") + "api/hosts", 15000)).getJSONArray("found");
                        for (int j = 0; j < more.length(); j++) {
                            JSONObject m = more.getJSONObject(j);
                            if (!seen.add(m.optString("name"))) continue;
                            JSONObject r = new JSONObject();
                            r.put("host", m.optString("host")).put("url", m.optString("url")).put("name", m.optString("name"))
                                .put("endpoint", m.optString("endpoint")).put("connected", m.optBoolean("connected"));
                            found.put(r);
                        }
                    } catch (Exception ignored) { }
                }
                String json = found.toString();
                ui.post(() -> web.evaluateJavascript("window.onScan && window.onScan(" + json + ")", null));
            }).start();
        }

        /** Najnowsze wydanie z GitHuba (jest internet): window.onRelease(JSON | null). */
        @JavascriptInterface
        public void checkRelease() {
            new Thread(() -> {
                String json;
                try {
                    json = get("https://api.github.com/repos/PatrykChoinski/Promasz-Visu3D/releases/latest", 6000);
                } catch (Exception e) {
                    json = "null";
                }
                String j = json;
                ui.post(() -> web.evaluateJavascript("window.onRelease && window.onRelease(" + j + ")", null));
            }).start();
        }

        @JavascriptInterface
        public void download(String url) {
            ui.post(() -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))));
        }
    }
}
