package com.almogam.fiqhi.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new NativeShareBridge(), "AndroidShare");
        }
    }

    private class NativeShareBridge {
        @JavascriptInterface
        public void share(String title, String text) {
            Intent sendIntent = new Intent(Intent.ACTION_SEND);
            sendIntent.setType("text/plain");
            sendIntent.putExtra(Intent.EXTRA_SUBJECT, title);
            sendIntent.putExtra(Intent.EXTRA_TEXT, text);
            Intent shareIntent = Intent.createChooser(sendIntent, title);
            startActivity(shareIntent);
        }

        @JavascriptInterface
        public String saveBenchmarkFiles(String jsonContent, String csvContent) {
            try {
                File dir = getExternalFilesDir(null);
                if (dir == null) {
                    dir = getFilesDir();
                }
                File jsonFile = new File(dir, "ai_benchmark_logs.json");
                FileOutputStream fosJson = new FileOutputStream(jsonFile);
                fosJson.write(jsonContent.getBytes(StandardCharsets.UTF_8));
                fosJson.close();

                File csvFile = new File(dir, "ai_benchmark_logs.csv");
                FileOutputStream fosCsv = new FileOutputStream(csvFile);
                fosCsv.write(csvContent.getBytes(StandardCharsets.UTF_8));
                fosCsv.close();

                return jsonFile.getAbsolutePath();
            } catch (Exception e) {
                return "error: " + e.getMessage();
            }
        }
    }
}
