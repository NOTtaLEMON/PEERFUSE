#!/usr/bin/env python3
"""
PeerFuse Backend Setup Script
This script helps you set up the backend environment
"""

import os
import sys
import subprocess
from pathlib import Path

def print_header(text):
    """Print formatted header"""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)

def check_python_version():
    """Ensure Python 3.8+"""
    print_header("Checking Python Version")
    version = sys.version_info
    print(f"✅ Python {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8 or higher is required!")
        sys.exit(1)

def install_dependencies():
    """Install required packages"""
    print_header("Installing Dependencies")
    
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        sys.exit(1)

def setup_env_file():
    """Create .env file from template"""
    print_header("Setting Up Environment Variables")
    
    env_file = Path(".env")
    example_file = Path(".env.example")
    
    if env_file.exists():
        print("⚠️  .env file already exists")
        response = input("Do you want to overwrite it? (y/N): ").strip().lower()
        if response != 'y':
            print("Skipping .env setup")
            return
    
    if not example_file.exists():
        print("❌ .env.example not found!")
        return
    
    # Copy template
    with open(example_file, 'r') as f:
        content = f.read()
    
    with open(env_file, 'w') as f:
        f.write(content)
    
    print("✅ Created .env file from template")
    print("\n📝 Next steps:")
    print("   1. Get your Gemini API key from: https://aistudio.google.com/app/apikey")
    print("   2. Edit backend/.env and replace 'your_gemini_api_key_here' with your actual key")
    print("   3. Save the file")

def verify_setup():
    """Verify the setup is correct"""
    print_header("Verifying Setup")
    
    env_file = Path(".env")
    if not env_file.exists():
        print("⚠️  .env file not found")
        return False
    
    # Check if API key is set
    with open(env_file, 'r') as f:
        content = f.read()
    
    if "your_gemini_api_key_here" in content or "your_actual" in content:
        print("⚠️  API key not configured yet")
        print("   Please edit .env and add your actual Gemini API key")
        return False
    
    if "GOOGLE_API_KEY=" in content or "GEMINI_API_KEY=" in content:
        print("✅ API key appears to be configured")
        return True
    
    return False

def main():
    """Main setup process"""
    print("\n🚀 PeerFuse Backend Setup")
    print("This script will help you set up the backend environment\n")
    
    # Change to backend directory if needed
    if Path("backend").exists() and Path.cwd().name != "backend":
        os.chdir("backend")
        print(f"📂 Changed to backend directory: {Path.cwd()}")
    
    # Step 1: Check Python version
    check_python_version()
    
    # Step 2: Install dependencies
    install_dependencies()
    
    # Step 3: Set up .env file
    setup_env_file()
    
    # Step 4: Verify setup
    is_configured = verify_setup()
    
    # Final instructions
    print_header("Setup Complete!")
    
    if is_configured:
        print("✅ Backend is ready to run!")
        print("\nStart the server with:")
        print("   python app.py")
    else:
        print("⚠️  Almost there! Complete these steps:")
        print("   1. Edit backend/.env")
        print("   2. Add your Gemini API key")
        print("   3. Run: python app.py")
    
    print("\n📖 For more information, see backend/README.md")
    print("🔒 Security guide: SECURITY.md")
    print("\n" + "=" * 60 + "\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup cancelled by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)
