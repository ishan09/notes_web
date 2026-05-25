# Python Installation & Setup

> **Before you start**: Do you have a computer with internet access? Let's get Python installed!

## What is Python Installation?

Python installation means getting the Python interpreter (the program that runs Python code) onto your computer. Think of it like installing Java JDK - you need it before you can run any code.

**Real-world analogy**: Installing Python is like installing a language translator on your computer. Without it, your computer can't understand Python code, just like you can't read Japanese without learning the language first.

## Why This Matters for AI/ML

**You'll need Python installation for**:
- Running ML libraries (TensorFlow, PyTorch, scikit-learn all require Python)
- Using AI frameworks (LangChain, OpenAI SDK, Anthropic SDK)
- Data processing tools (NumPy, pandas)
- Building agent systems

**AI/ML Context**: Most AI/ML tools are Python-first. While Java has ML libraries, the Python ecosystem is 10x larger and more mature for AI work.

## How to Install Python

### Check if Python is Already Installed

Open your terminal and run:

```bash
python3 --version
```

If you see something like `Python 3.11.5` or higher, you're good! If not, follow the steps below.

### macOS Installation (Recommended: Homebrew)

**Option 1: Using Homebrew (Best for developers)**

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python
brew install python@3.11

# Verify installation
python3 --version
```

**Option 2: Official Installer**

1. Go to [python.org/downloads](https://www.python.org/downloads/)
2. Download Python 3.11+ installer for macOS
3. Run the installer (click through the prompts)
4. Open Terminal and verify: `python3 --version`

### Windows Installation

**Option 1: Official Installer (Recommended)**

1. Go to [python.org/downloads](https://www.python.org/downloads/)
2. Download Python 3.11+ installer for Windows
3. **IMPORTANT**: Check "Add Python to PATH" during installation
4. Run the installer
5. Open Command Prompt and verify: `python --version`

**Option 2: Windows Store**

1. Open Microsoft Store
2. Search for "Python 3.11"
3. Click Install
4. Verify: `python --version`

### Linux Installation

**Ubuntu/Debian**:

```bash
sudo apt update
sudo apt install python3.11 python3-pip
python3 --version
```

**Fedora/RHEL**:

```bash
sudo dnf install python3.11
python3 --version
```

## Verify Installation

After installation, verify Python is working:

```bash
# Check Python version (should be 3.9 or higher for AI/ML)
python3 --version

# Check pip (Python package manager) is installed
pip3 --version

# Run Python interactively
python3
```

You should see something like:

```
Python 3.11.5 (main, Sep 11 2023, 13:54:46)
[Clang 14.0.3 (clang-1403.0.22.14.1)] on darwin
Type "help", "copyright", "credits" or "license" for more information.
>>>
```

Type `exit()` or press `Ctrl+D` to exit the Python interpreter.

## Try It

**Exercise 1**: Run your first Python code

```bash
# Start Python interpreter
python3

# Type this and press Enter:
>>> print("Hello, AI!")
Hello, AI!

# Try some math:
>>> 2 + 2
4

# Exit:
>>> exit()
```

**Exercise 2**: Create your first Python file

```bash
# Create a file called hello.py
echo 'print("Python is ready for AI/ML!")' > hello.py

# Run it
python3 hello.py
```

You should see: `Python is ready for AI/ML!`

## Self-Check Questions

> Answer from memory before checking

1. **What** version of Python should you install for AI/ML work?
2. **Why** do we need Python 3.x instead of Python 2.x?
3. **When** should you use system Python vs custom installation?
4. **How** do you verify Python is installed correctly?
5. **Compare**: What's the difference between `python` and `python3` commands?

<details>
<summary>Click to reveal answers</summary>

1. **Python 3.9 or higher** (preferably 3.11+) for AI/ML. Most ML libraries dropped Python 2 support and require modern Python 3 features.

2. **Python 2 is obsolete** (retired January 2020). Python 3 has better performance, Unicode support, async features, and all modern AI/ML libraries require it.

3. **Use custom installation** (Homebrew/official installer) over system Python. System Python may be outdated or used by OS tools. Custom installation gives you control over versions.

4. Run `python3 --version` (should show 3.9+) and `pip3 --version` (should show pip is installed). Also test by running `python3` to enter interactive mode.

5. On macOS/Linux, `python` often points to Python 2 (old), while `python3` points to Python 3. On Windows with modern installs, both point to Python 3. Always use `python3` to be safe.

</details>

## Practice Exercises

**Level 1 - Understand**:

Try running these commands and observe the output:

```bash
# Check Python version
python3 --version

# Enter interactive Python and try:
python3
>>> import sys
>>> sys.version
>>> print("Python", sys.version_info.major, ".", sys.version_info.minor)
>>> exit()
```

**Level 2 - Apply**:

Create a file called `check_python.py` with this content:

```python
import sys

print(f"Python version: {sys.version}")
print(f"Executable location: {sys.executable}")
print(f"Is Python 3.9+? {sys.version_info >= (3, 9)}")
```

Run it: `python3 check_python.py`

**Level 3 - Create**:

Write a Python script that:
1. Checks if Python version is 3.9 or higher
2. Prints "✅ Ready for AI/ML" if yes
3. Prints "❌ Please upgrade Python" if no

<details>
<summary>Solution</summary>

```python
import sys

major, minor = sys.version_info.major, sys.version_info.minor

if major >= 3 and minor >= 9:
    print("✅ Ready for AI/ML")
    print(f"   Your version: Python {major}.{minor}")
else:
    print("❌ Please upgrade Python")
    print(f"   Your version: Python {major}.{minor}")
    print("   Required: Python 3.9+")
```

</details>

## Common Mistakes

❌ **Mistake 1**: Installing Python 2 instead of Python 3
```bash
# Wrong (Python 2 is dead)
brew install python@2

# Right
brew install python@3.11
```
**Why it's wrong**: Python 2 is no longer supported. All AI/ML libraries require Python 3.

✅ **Instead**: Always install Python 3.9 or higher.

---

❌ **Mistake 2**: Not checking "Add Python to PATH" on Windows
- After installation, `python` command doesn't work in Command Prompt
- You have to use full path like `C:\Python311\python.exe`

✅ **Instead**: During Windows installation, CHECK the box "Add Python to PATH". If you forgot, re-run installer and select "Modify" → check PATH option.

---

❌ **Mistake 3**: Using `python` instead of `python3` on macOS/Linux
```bash
# Might run Python 2 (wrong)
python --version

# Always use python3 to be safe
python3 --version
```

✅ **Instead**: On macOS/Linux, always use `python3` command until you're sure what `python` points to.

## How This Connects

**Builds on**:
- None - This is your starting point!

**Related concepts**:
- [Virtual Environments](./02-virtual-environments.md) - Isolate project dependencies (next topic!)
- [Package Management](./03-pip-poetry.md) - Install AI/ML libraries

**Why this matters for AI**:
- All ML libraries (PyTorch, TensorFlow, scikit-learn) require Python 3.9+
- LLM SDKs (OpenAI, Anthropic) are Python-first
- Version compatibility matters - some libraries require specific Python versions

**Next steps**:
- [Virtual Environments](./02-virtual-environments.md) - Essential before installing any packages

## Deep Dive Questions (Expert Level)

> These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:
1. How does Python's installation directory structure differ across operating systems? Where are site-packages located on macOS vs Linux vs Windows?
2. What is the CPython implementation and how does it differ from PyPy, Jython, or IronPython? When would you choose an alternative implementation for ML workloads?

**Production Scenarios**:
1. How do you manage multiple Python versions in production environments (e.g., some services need 3.9, others need 3.11)?
2. What's the best practice for Python installation in Docker containers for ML services? How do you minimize image size while keeping all necessary dependencies?

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#memory-management) for comprehensive list

## Summary

**In 3 sentences**:
- Python 3.9+ is required for modern AI/ML development; install it using Homebrew (macOS), official installer (Windows), or package manager (Linux)
- Verify installation with `python3 --version` and ensure pip is available with `pip3 --version`
- Always use `python3` on macOS/Linux to avoid accidentally using Python 2

**Key takeaway**: Think of Python installation like installing the JDK for Java - it's the foundation that everything else builds on. No Python interpreter = no AI/ML code!
