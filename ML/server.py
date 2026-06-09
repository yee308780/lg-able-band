from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os


HOST = "127.0.0.1"
PORT = int(os.environ.get("ML_PORT", "8000"))


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path not in {"/", "/health"}:
            self.send_response(404)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Not found"}).encode("utf-8"))
            return

        payload = {
            "service": "ml-test-server",
            "status": "running",
            "port": PORT,
            "message": "Placeholder ML server for local integration tests.",
        }

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"ML server running on http://{HOST}:{PORT}")
    server.serve_forever()
