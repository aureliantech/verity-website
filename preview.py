#!/usr/bin/env python3
"""
Verity Law Firm — local preview server.

Serves this folder at http://localhost:8000 and mimics Vercel's "clean URLs"
so that links like /wills and /estate-planning resolve to wills.html and
estate-planning.html, exactly as they will in production.

Usage:   python3 preview.py
Stop:    Ctrl+C
"""

import http.server
import socketserver
import os
import sys
import webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.abspath(__file__))


class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        fs = super().translate_path(path)

        # /  ->  index.html
        if os.path.isdir(fs):
            index = os.path.join(fs, 'index.html')
            if os.path.exists(index):
                return index

        # /wills  ->  wills.html
        if not os.path.exists(fs) and not fs.endswith('.html'):
            if os.path.exists(fs + '.html'):
                return fs + '.html'

        return fs

    def end_headers(self):
        # never cache during preview, so edits show up on refresh
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def log_message(self, fmt, *args):
        code = str(args[1]) if len(args) > 1 else ''
        if code.startswith('4') or code.startswith('5'):
            sys.stderr.write("  %s %s\n" % (code, args[0]))


socketserver.TCPServer.allow_reuse_address = True

os.chdir(ROOT)
url = "http://localhost:%d" % PORT

with socketserver.TCPServer(("", PORT), CleanURLHandler) as httpd:
    print("")
    print("  Verity Law Firm — local preview")
    print("  " + "-" * 38)
    print("  Serving:  %s" % ROOT)
    print("  Open:     %s" % url)
    print("")
    print("  Press Ctrl+C to stop.")
    print("")
    try:
        webbrowser.open(url)
    except Exception:
        pass
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Preview stopped.\n")
