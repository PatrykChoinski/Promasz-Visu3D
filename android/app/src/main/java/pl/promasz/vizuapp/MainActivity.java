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

    /** Adresy do sprawdzenia: podsieci /24 kart sieciowych telefonu (Wi-Fi, VPN). */
    static List<String> hosts() {
        Set<String> out = new LinkedHashSet<>();
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

        /** Otwiera maszyne i zapamietuje ja na nastepne uruchomienie. */
        @JavascriptInterface
        public void open(String url) {
            prefs.edit().putString("url", url).apply();
            ui.post(() -> web.loadUrl(url));
        }

        @JavascriptInterface
        public void forget() { prefs.edit().remove("url").apply(); }

        /** Szukanie maszyn z VizuApp; wynik: window.onScan(JSON [{host, url, name, endpoint, connected}]). */
        @JavascriptInterface
        public void scan() {
            new Thread(() -> {
                List<String> hs = hosts();
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
