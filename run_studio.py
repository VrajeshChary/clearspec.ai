import sys
import webbrowser
import time
import uvicorn
from pathlib import Path

def main():
    print("=" * 65)
    print("  LAUNCHING ASTRA STUDIO — GPT-6 CAPABILITY TESTBED")
    print("  Gateway: https://api.xingchiapi.com/v1")
    print("  Models: gpt-6-astra, gpt-6.1-sol, gpt-image-2.6-sunburst")
    print("  Local URL: http://localhost:8088")
    print("=" * 65)

    app_path = "astra_studio.server:app"
    
    # Give a second and open browser
    def open_browser():
        time.sleep(1.2)
        try:
            webbrowser.open("http://localhost:8088")
        except Exception:
            pass

    import threading
    t = threading.Thread(target=open_browser)
    t.daemon = True
    t.start()

    uvicorn.run(app_path, host="0.0.0.0", port=8088, reload=True)

if __name__ == "__main__":
    main()
