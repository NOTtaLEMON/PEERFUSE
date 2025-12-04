"""
Simple script to check if backend is running and return status
"""
import sys

try:
    import requests
    response = requests.get('http://localhost:5000/health', timeout=1)
    if response.status_code == 200:
        print("RUNNING")
        sys.exit(0)
except:
    pass

print("NOT_RUNNING")
sys.exit(1)
