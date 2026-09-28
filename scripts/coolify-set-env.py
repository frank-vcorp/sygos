#!/usr/bin/env python3
"""Set or replace one app env var in Coolify (contabo-integra)."""
import json
import os
import sys
import urllib.request

APP = sys.argv[1] if len(sys.argv) > 1 else "3zamnoefpehquagdcvi2578i"
KEY = sys.argv[2]
VALUE = sys.argv[3]
BASE = "https://app.coolify.io/api/v1"


def req(method, path, body=None, read=False):
    token = os.environ["COOLIFY_READ_TOKEN" if read else "COOLIFY_WRITE_TOKEN"]
    data = None if body is None else json.dumps(body).encode()
    r = urllib.request.Request(
        BASE + path,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "kilo/1",
        },
    )
    with urllib.request.urlopen(r, timeout=60) as resp:
        raw = resp.read().decode()
        return json.loads(raw) if raw else {}


envs = req("GET", f"/applications/{APP}/envs", read=True)
for e in envs:
    if e.get("key") == KEY:
        req("DELETE", f"/applications/{APP}/envs/{e['uuid']}")
req(
    "POST",
    f"/applications/{APP}/envs",
    {
        "key": KEY,
        "value": VALUE,
        "is_literal": True,
        "is_runtime": True,
        "is_buildtime": False,
    },
)
print(f"set {KEY}")
