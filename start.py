import http.server
import socketserver
import webbrowser
import os

PORT = 5000
DIR = os.path.dirname(os.path.abspath(__file__))

os.chdir(DIR)

handler = http.server.SimpleHTTPRequestHandler
handler.extensions_map.update({
    ".js": "application/javascript",
    ".glb": "model/gltf-binary",
    ".gltf": "model/gltf+json",
})

with socketserver.TCPServer(("", PORT), handler) as httpd:
    url = f"http://localhost:{PORT}"
    print(f"Oyun işə düşdü: {url}")
    print("Bağlamaq üçün Ctrl+C basın.")
    webbrowser.open(url)
    httpd.serve_forever()
