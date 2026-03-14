import pathlib
import subprocess
import time
import webbrowser


PORT = 5000
ROOT = pathlib.Path(__file__).resolve().parent
URL = f"http://localhost:{PORT}"


def main():
    server_script = ROOT / "server.js"
    if not server_script.exists():
        print(f"server.js tapilmadi: {server_script}")
        return 1

    try:
        process = subprocess.Popen(["node", str(server_script)], cwd=str(ROOT))
    except FileNotFoundError:
        print("Node.js tapilmadi. Evvelce Node qurasdir, sonra yeniden yoxla.")
        return 1

    print(f"Oyun server ile acilir: {URL}")
    print("Room sistemi ve socket ucun Python static server yox, Node server isledilir.")
    print("Baglamaq ucun Ctrl+C bas.")

    try:
        time.sleep(1.2)
        webbrowser.open(URL)
        return process.wait()
    except KeyboardInterrupt:
        print("\nServer dayandirilir...")
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
