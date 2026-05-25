# IDE & Development Tools Setup

> **Before you start**: Have Python and pip installed? Review [Installation Setup](./01-installation-setup.md) if needed.

## What is an IDE/Editor?

An **Integrated Development Environment (IDE)** or **code editor** is your workspace for writing Python code. Think of it like a word processor for code - it helps you write, debug, and run programs efficiently.

**Real-world analogy**: Writing Python in a plain text editor is like writing a novel in Notepad. An IDE is like Microsoft Word with spell-check, grammar suggestions, auto-complete, and formatting tools. Both work, but one makes you much more productive.

## Why This Matters for AI/ML

**You'll need a good IDE/editor for**:
- Code completion for ML libraries (helps you discover TensorFlow/PyTorch APIs)
- Debugging model training issues
- Interactive Jupyter notebooks for experiments
- Type hints and linting to catch errors early
- Git integration for version control

**AI/ML Context**: ML development is experimental - you'll run code snippets, visualize data, and iterate quickly. A good IDE with Jupyter integration makes this 10x easier.

## Recommended IDEs/Editors

### VS Code (Recommended for Beginners & AI/ML)

**Why VS Code**:
- Free and lightweight
- Excellent Python extension with IntelliSense
- Built-in Jupyter notebook support
- Great for remote development (SSH, Docker)
- Huge ecosystem of extensions

**Installation**:

```bash
# macOS (Homebrew)
brew install --cask visual-studio-code

# Or download from https://code.visualstudio.com/
```

**Essential VS Code Extensions**:

```bash
# Install from VS Code Extensions marketplace (Cmd+Shift+X or Ctrl+Shift+X)
```

1. **Python** (by Microsoft) - Core Python support
   - IntelliSense (code completion)
   - Linting (pylint, flake8, mypy)
   - Debugging
   - Code formatting (black, autopep8)
   - Testing (pytest, unittest)

2. **Jupyter** (by Microsoft) - Notebook support
   - Run .ipynb files directly in VS Code
   - Interactive Python REPL
   - Variable explorer for ML debugging

3. **Pylance** (by Microsoft) - Advanced type checking
   - Fast IntelliSense
   - Type stubs for libraries
   - Auto-imports

4. **autoDocstring** - Generate docstrings automatically
   - Google, NumPy, Sphinx formats
   - Essential for documenting ML code

5. **Python Indent** - Better auto-indentation
   - Fixes annoying indentation issues

6. **GitLens** - Supercharge Git
   - Inline git blame
   - Code authorship
   - Commit history

7. **Error Lens** - Inline error highlighting
   - See errors/warnings directly in code
   - No need to hover

8. **indent-rainbow** - Colorize indentation
   - Makes Python indentation visual
   - Helpful for complex nested code

**Optional but Useful**:
- **Python Test Explorer** - GUI for running tests
- **Python Environment Manager** - Manage virtual environments
- **Remote - SSH** - Develop on remote servers
- **Docker** - Container support for ML deployments
- **Markdown All in One** - Better markdown editing
- **Even Better TOML** - For pyproject.toml files

### PyCharm (Best for Professional Python Development)

**Why PyCharm**:
- Most powerful Python IDE
- Built-in everything (debugger, profiler, database tools)
- Excellent refactoring tools
- Scientific mode for data science
- Professional version has advanced features (but costs money)

**Installation**:

```bash
# macOS (Homebrew)
brew install --cask pycharm-ce  # Community Edition (free)
# OR
brew install --cask pycharm     # Professional (paid, 30-day trial)

# Or download from https://www.jetbrains.com/pycharm/
```

**Built-in Features** (no plugins needed):
- Intelligent code completion
- Code analysis and quick-fixes
- Refactoring (rename, extract method, etc.)
- Debugger with breakpoints and watches
- pytest/unittest integration
- Git integration
- Virtual environment management
- Jupyter notebook support (Professional only)
- Database tools (Professional only)
- Remote interpreter (Professional only)

**Recommended PyCharm Plugins**:

1. **Key Promoter X** - Learn keyboard shortcuts
2. **Rainbow Brackets** - Colorize matching brackets
3. **String Manipulation** - Case conversion, sorting
4. **.ignore** - Git ignore file support
5. **Atom Material Icons** - Better file icons

### Jupyter Lab/Notebook (Essential for ML Experimentation)

**Why Jupyter**:
- Interactive coding (run code cell-by-cell)
- Inline visualizations (plots, images)
- Mix code with markdown documentation
- Standard for ML/data science tutorials

**Installation**:

```bash
# Inside your virtual environment
pip install jupyterlab

# Run Jupyter Lab
jupyter lab

# Or classic Jupyter Notebook
pip install notebook
jupyter notebook
```

**Usage**:

```bash
# Start Jupyter Lab (modern interface)
jupyter lab

# Start Jupyter Notebook (classic interface)
jupyter notebook

# Access at http://localhost:8888
```

**Jupyter Extensions** (JupyterLab 3+):

```bash
# Variable inspector (see all variables)
pip install lckr-jupyterlab-variableinspector

# Table of contents
# (built-in, enable from View menu)

# Code formatter
pip install jupyterlab-code-formatter black isort
```

### Other Options

**Vim/Neovim** (For Terminal Power Users):
- Extremely fast
- Steep learning curve
- Requires extensive plugin configuration
- Great for remote work over SSH

**Sublime Text**:
- Lightweight and fast
- Good Python support with plugins
- Paid license (but unlimited trial)

**Atom** (Deprecated):
- GitHub sunset Atom in 2022
- Use VS Code instead (same foundation)

## Essential Python Tools to Install

### Code Formatters

**Black** (Opinionated formatter):

```bash
pip install black

# Format a file
black script.py

# Format entire project
black .

# VS Code: Enable "Format on Save" with Black
```

**autopep8** (PEP 8 formatter):

```bash
pip install autopep8

# Format a file
autopep8 --in-place --aggressive script.py
```

**isort** (Import sorting):

```bash
pip install isort

# Sort imports
isort script.py

# Sort all Python files
isort .
```

### Linters (Code Quality Checkers)

**pylint** (Comprehensive linter):

```bash
pip install pylint

# Check a file
pylint script.py

# Generate config
pylint --generate-rcfile > .pylintrc
```

**flake8** (Fast linter):

```bash
pip install flake8

# Check a file
flake8 script.py

# Configure in setup.cfg or .flake8
```

**mypy** (Static type checker):

```bash
pip install mypy

# Type check a file
mypy script.py

# Configure in mypy.ini or pyproject.toml
```

### Debugging Tools

**ipdb** (IPython debugger):

```bash
pip install ipdb

# Add breakpoint in code
import ipdb; ipdb.set_trace()

# Or use Python 3.7+ built-in
breakpoint()  # Drops into debugger
```

**pdb** (Built-in debugger):

```python
import pdb; pdb.set_trace()

# Common commands:
# n - next line
# s - step into function
# c - continue
# l - list code around current line
# p variable - print variable
# q - quit
```

### Testing Tools

**pytest** (Modern testing framework):

```bash
pip install pytest pytest-cov

# Run tests
pytest

# Run with coverage
pytest --cov=myproject

# Run specific test
pytest tests/test_model.py::test_accuracy
```

**unittest** (Built-in testing):

```python
import unittest

# No installation needed (part of standard library)
```

### Virtual Environment Tools

**virtualenv** (Alternative to venv):

```bash
pip install virtualenv

# Create environment
virtualenv myenv

# Activate
source myenv/bin/activate  # macOS/Linux
myenv\Scripts\activate     # Windows
```

**pipenv** (Combines pip + venv):

```bash
pip install pipenv

# Create environment and install packages
pipenv install numpy pandas

# Activate environment
pipenv shell

# Run script in environment
pipenv run python script.py
```

**poetry** (Modern dependency management):

```bash
# Install poetry
curl -sSL https://install.python-poetry.org | python3 -

# Create new project
poetry new myproject

# Install dependencies
poetry add numpy pandas

# Activate environment
poetry shell
```

### Documentation Tools

**Sphinx** (Documentation generator):

```bash
pip install sphinx

# Create documentation
sphinx-quickstart docs

# Build HTML docs
cd docs
make html
```

**mkdocs** (Markdown documentation):

```bash
pip install mkdocs mkdocs-material

# Create docs site
mkdocs new my-project

# Serve locally
mkdocs serve
```

### Performance & Profiling

**cProfile** (Built-in profiler):

```bash
# Profile a script
python -m cProfile -s cumulative script.py
```

**line_profiler** (Line-by-line profiling):

```bash
pip install line_profiler

# Add @profile decorator to functions
# Run profiler
kernprof -l -v script.py
```

**memory_profiler** (Memory usage):

```bash
pip install memory_profiler

# Add @profile decorator
# Run profiler
python -m memory_profiler script.py
```

## VS Code Configuration for Python

Create `.vscode/settings.json` in your project:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.linting.flake8Enabled": true,
  "python.linting.mypyEnabled": true,
  "python.formatting.provider": "black",
  "python.formatting.blackArgs": ["--line-length", "88"],
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "python.testing.pytestEnabled": true,
  "python.testing.unittestEnabled": false,
  "python.analysis.typeCheckingMode": "basic",
  "files.exclude": {
    "**/__pycache__": true,
    "**/.pytest_cache": true,
    "**/*.pyc": true
  }
}
```

## PyCharm Configuration

**Enable auto-formatting**:
1. Settings → Tools → Black
2. Check "On code reformat" and "On save"

**Enable type checking**:
1. Settings → Editor → Inspections
2. Enable "Type checker" inspections

**Configure interpreter**:
1. Settings → Project → Python Interpreter
2. Add → Virtualenv Environment → Existing or New

## Try It

**Exercise 1**: Set up VS Code for Python

```bash
# 1. Install VS Code
brew install --cask visual-studio-code

# 2. Install Python extension
# Open VS Code → Extensions (Cmd+Shift+X)
# Search "Python" → Install Microsoft's Python extension

# 3. Create test project
mkdir python_test
cd python_test
python3 -m venv venv
source venv/bin/activate
code .  # Opens VS Code

# 4. Create test.py
echo 'print("Hello from VS Code!")' > test.py

# 5. Run with F5 or right-click → Run Python File
```

**Exercise 2**: Install essential tools

```bash
# Activate your virtual environment
source venv/bin/activate

# Install formatter, linter, testing
pip install black pylint pytest ipdb

# Test black
echo 'x=1;y=2;print(x+y)' > messy.py
black messy.py
cat messy.py  # Should be formatted nicely

# Test pylint
pylint messy.py

# Test pytest
mkdir tests
echo 'def test_addition(): assert 1 + 1 == 2' > tests/test_basic.py
pytest
```

**Exercise 3**: Set up Jupyter

```bash
# Install Jupyter
pip install jupyterlab

# Start Jupyter Lab
jupyter lab

# Create new notebook
# Cell 1: print("Hello Jupyter!")
# Cell 2: import numpy as np; np.array([1, 2, 3])
# Run cells with Shift+Enter
```

## Self-Check Questions

1. **What** is the difference between VS Code and PyCharm?
2. **Why** do we need both a code formatter (black) and a linter (pylint)?
3. **When** should you use Jupyter notebooks vs regular Python scripts?
4. **How** do you enable format-on-save in VS Code?
5. **Compare**: What are the tradeoffs between VS Code and PyCharm for ML development?

<details>
<summary>Click to reveal answers</summary>

1. **VS Code** is a lightweight editor with Python support via extensions. **PyCharm** is a full IDE built specifically for Python with everything integrated. VS Code is faster and more customizable; PyCharm is more powerful out-of-the-box.

2. **Code formatters** (black) automatically fix style issues (spacing, line length). **Linters** (pylint) detect potential bugs, code smells, and violations (unused variables, undefined names). You need both - formatter for consistency, linter for correctness.

3. **Jupyter notebooks** are great for exploration, data analysis, visualization, and documenting experiments (ML tutorials use notebooks). **Python scripts** are better for production code, libraries, automation, and anything that needs version control and testing.

4. In VS Code: Settings → search "format on save" → check "Editor: Format On Save". Also set default formatter in settings.json: `"python.formatting.provider": "black"`.

5. **VS Code**: Faster, free, better for polyglot development (Python + JS + Go), great remote development, lighter weight. **PyCharm**: More powerful refactoring, better code analysis, integrated everything (debugger, profiler, DB tools), easier for beginners (less config). For ML: VS Code + Jupyter extensions is often best.

</details>

## Common Mistakes

❌ **Mistake 1**: Not using a formatter (black/autopep8)

```python
# Inconsistent, hard to read
def calculate(x,y,z):
  result=x+y+z
  return result
```

✅ **Instead**: Use black to auto-format:

```python
def calculate(x, y, z):
    result = x + y + z
    return result
```

---

❌ **Mistake 2**: Ignoring linter warnings

```python
import os  # Imported but not used
import sys

def process(data):
    result = data * 2
    print(result)  # Missing return statement if this is supposed to be a function
```

**Why it's wrong**: Linters catch bugs early. Fix warnings before they become production issues.

✅ **Instead**: Fix linter warnings:

```python
import sys

def process(data):
    result = data * 2
    return result
```

---

❌ **Mistake 3**: Using Jupyter notebooks for everything

- Notebooks are great for exploration but bad for version control (JSON format)
- Hard to test notebook code
- Easy to run cells out of order and get inconsistent state

✅ **Instead**: Use notebooks for experiments, then refactor working code into .py modules:

```bash
my_ml_project/
  notebooks/           # Experiments and exploration
    01-data-exploration.ipynb
    02-model-training.ipynb
  src/                 # Production code (tested, version controlled)
    data_loader.py
    model.py
    train.py
  tests/
    test_data_loader.py
```

## How This Connects

**Builds on**:
- [Installation Setup](./01-installation-setup.md) - Python must be installed first
- [Virtual Environments](./02-virtual-environments.md) - IDE will use your venv

**Related concepts**:
- [Package Management](./03-pip-poetry.md) - Install tools like black, pylint
- [Type Hints](../03-advanced/01-type-hints.md) - Mypy checks types
- [Testing](../04-testing-quality/01-pytest.md) - VS Code/PyCharm integrate pytest

**Why this matters for AI**:
- ML development is iterative - good IDE speeds up experimentation
- Type checking (mypy) catches errors in ML pipelines before runtime
- Jupyter notebooks are standard for sharing ML research and tutorials
- Debugger is essential for understanding model behavior

**Next steps**:
- Configure your chosen IDE with Python extension
- Install black, pylint, pytest in your virtual environment
- Set up Jupyter for data exploration

## Deep Dive Questions (Expert Level)

**Tool Configuration**:
1. How do you configure different Python interpreters for different projects in VS Code? What about PyCharm's remote interpreters?
2. How would you set up a shared linting/formatting configuration across a team? What files do you need (.pylintrc, pyproject.toml, etc.)?

**Performance & Profiling**:
1. When should you use cProfile vs line_profiler vs memory_profiler for ML code? What are the overhead tradeoffs?
2. How do you profile GPU usage in ML training code? What tools work with PyTorch/TensorFlow?

**Production Scenarios**:
1. How do you integrate black/pylint into CI/CD pipelines? How do you enforce formatting without reformatting developers' uncommitted code?
2. What's the best way to debug ML models in production? How do you attach a debugger to a running training job?

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md) for comprehensive list

## Summary

**In 3 sentences**:
- Use **VS Code** (free, lightweight) or **PyCharm** (powerful, integrated) as your primary Python IDE with essential extensions like Python, Pylance, and Jupyter
- Install **development tools** in your virtual environment: black (formatting), pylint/flake8 (linting), mypy (type checking), pytest (testing), and ipdb (debugging)
- Use **Jupyter Lab** for interactive ML experiments and data exploration, but refactor production code into regular .py files for better version control and testing

**Key takeaway**: A good IDE setup is like having a professional workshop - the right tools make you 10x more productive. For AI/ML, the combo of VS Code + Jupyter + black/pylint is the sweet spot between power and simplicity.
