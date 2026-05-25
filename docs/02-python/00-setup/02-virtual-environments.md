# Virtual Environments

> **Before you start**: Have you installed Python? If not, review [Installation Setup](./01-installation-setup.md)

## What are Virtual Environments?

A virtual environment is an **isolated Python workspace** for your project. Think of it like having separate toolboxes - one for woodworking, one for electronics. Each toolbox has its own tools, and they don't get mixed up.

**Real-world analogy**: Imagine you're working on multiple construction projects. Project A needs hammer v1.0, Project B needs hammer v2.0. If you only have one toolbox (global installation), they'll conflict. Virtual environments give each project its own toolbox with the right tools.

## Why This Matters for AI/ML

**You'll need virtual environments for**:
- Isolating ML project dependencies (TensorFlow 2.x for one project, PyTorch for another)
- Avoiding version conflicts (pandas 1.5 vs pandas 2.0)
- Reproducible experiments (same environment = same results)
- Clean development (don't pollute system Python)

**AI/ML Context**: ML projects have TONS of dependencies. TensorFlow might need numpy 1.24, but another project needs numpy 1.23. Without virtual environments, you'll have constant conflicts.

## How Virtual Environments Work

When you create a virtual environment:

1. Python creates a **new directory** with a copy of the Python interpreter
2. It creates a **separate `site-packages`** folder for this project's libraries
3. When activated, your shell uses **this Python** instead of the system one
4. Package installations go into **this environment**, not globally

```bash
# Without venv: packages go to system Python
pip install numpy  # → /usr/local/lib/python3.11/site-packages/

# With venv: packages go to project's venv
pip install numpy  # → ./venv/lib/python3.11/site-packages/
```

## Creating Your First Virtual Environment

### Step 1: Create a Virtual Environment

```bash
# Create a directory for your project
mkdir my_ml_project
cd my_ml_project

# Create virtual environment named 'venv'
python3 -m venv venv

# This creates a 'venv' folder with:
# - Python interpreter copy
# - pip (package manager)
# - site-packages (for installed libraries)
```

### Step 2: Activate the Virtual Environment

**macOS/Linux**:
```bash
source venv/bin/activate
```

**Windows**:
```bash
venv\Scripts\activate
```

You'll see `(venv)` appear in your terminal prompt:
```bash
(venv) user@computer:~/my_ml_project$
```

### Step 3: Verify It's Active

```bash
# Check which Python you're using
which python  # Should show: .../my_ml_project/venv/bin/python

# Check Python location
python -c "import sys; print(sys.prefix)"
# Should show: .../my_ml_project/venv
```

### Step 4: Install Packages in the Environment

```bash
# Now installations go to THIS environment only
pip install numpy pandas scikit-learn

# Check installed packages
pip list
```

### Step 5: Deactivate When Done

```bash
deactivate
# (venv) disappears from prompt
```

## Try It

**Exercise 1**: Create and test a virtual environment

```bash
# Create project folder
mkdir test_venv && cd test_venv

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate  # Windows

# Install a package
pip install requests

# Test it
python -c "import requests; print(requests.__version__)"

# Deactivate
deactivate
```

**Exercise 2**: See isolation in action

```bash
# Outside venv - check if requests is installed
python3 -c "import requests"
# Should fail: ModuleNotFoundError (unless you had it globally)

# Inside venv - same command works
source venv/bin/activate
python -c "import requests; print('Works!')"
deactivate
```

## Self-Check Questions

> Answer from memory before checking

1. **What** problem do virtual environments solve?
2. **Why** can't you just install all packages globally?
3. **When** should you create a new virtual environment?
4. **How** do you activate and deactivate a virtual environment?
5. **Compare**: venv vs virtualenv vs conda - what are the differences?

<details>
<summary>Click to reveal answers</summary>

1. **Dependency isolation and version conflicts**. They let each project have its own Python packages without interfering with other projects or system Python.

2. **Global installation causes conflicts**. If Project A needs pandas 1.5 and Project B needs pandas 2.0, global installation can only have one version. Also, you might break system tools that depend on specific versions.

3. **Create a new venv for each Python project**. As soon as you start a project that needs any external packages (numpy, pandas, etc.), create a venv first. It's like starting with a clean workspace.

4. **Activate**: `source venv/bin/activate` (macOS/Linux) or `venv\Scripts\activate` (Windows). **Deactivate**: Just type `deactivate`. When active, you'll see `(venv)` in your prompt.

5. **venv** (built-in, simple), **virtualenv** (older, more features), **conda** (package + environment manager, good for data science). For most AI/ML work, **venv is sufficient**. Use conda if you need non-Python dependencies or complex environments.

</details>

## Practice Exercises

**Level 1 - Understand**:

Create a virtual environment and explore its structure:

```bash
mkdir explore_venv && cd explore_venv
python3 -m venv myenv

# Look at the structure
ls -la myenv/
ls -la myenv/bin/  # Executables (python, pip, activate)
ls -la myenv/lib/  # Python packages go here
```

**Level 2 - Apply**:

Create two separate virtual environments with different package versions:

```bash
# Project 1 - older numpy
mkdir project1 && cd project1
python3 -m venv venv
source venv/bin/activate
pip install numpy==1.23.0
python -c "import numpy; print(numpy.__version__)"  # 1.23.0
deactivate
cd ..

# Project 2 - newer numpy
mkdir project2 && cd project2
python3 -m venv venv
source venv/bin/activate
pip install numpy==1.24.0
python -c "import numpy; print(numpy.__version__)"  # 1.24.0
deactivate
```

**Level 3 - Create**:

Create a shell script that:
1. Creates a virtual environment
2. Activates it
3. Installs requirements from a file
4. Runs a Python script

<details>
<summary>Solution</summary>

Create `setup_and_run.sh`:

```bash
#!/bin/bash

# Create virtual environment
python3 -m venv venv

# Activate (for macOS/Linux)
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run your script
python main.py

# Deactivate
deactivate
```

Make it executable: `chmod +x setup_and_run.sh`

Run it: `./setup_and_run.sh`

</details>

## Common Mistakes

❌ **Mistake 1**: Committing `venv/` folder to git

```bash
# Wrong - venv folder in git repo
git add .
git commit -m "Added project"  # Includes 1000s of venv files
```

**Why it's wrong**: Virtual environments are machine-specific and huge (100+ MB). They should be recreated, not shared.

✅ **Instead**: Add `venv/` to `.gitignore`:

```bash
echo "venv/" >> .gitignore
```

Share `requirements.txt` instead (see next topic).

---

❌ **Mistake 2**: Installing packages before activating venv

```bash
# Wrong order
python3 -m venv venv
pip install numpy  # Goes to system Python!
source venv/bin/activate  # Activated, but numpy not here
```

✅ **Instead**: Always activate FIRST, then install:

```bash
python3 -m venv venv
source venv/bin/activate  # Activate first
pip install numpy  # Now goes to venv
```

---

❌ **Mistake 3**: Forgetting to deactivate when switching projects

```bash
# In project1's venv
(venv) $ cd ../project2
(venv) $ pip install something  # Still installing to project1!
```

✅ **Instead**: Deactivate before switching projects:

```bash
(venv) $ deactivate
$ cd ../project2
$ source venv/bin/activate
(venv) $ pip install something  # Now in project2's venv
```

---

❌ **Mistake 4**: Using system Python instead of venv Python

```bash
source venv/bin/activate
python3 script.py  # Might use system python3, not venv's
```

✅ **Instead**: When venv is active, use `python` (no 3):

```bash
source venv/bin/activate
python script.py  # Uses venv's Python
```

## How This Connects

**Builds on**:
- [Installation Setup](./01-installation-setup.md) - Requires Python installed first

**Related concepts**:
- [Package Management](./03-pip-poetry.md) - Install packages in venvs (next topic!)
- [Project Structure](../04-testing-quality/03-project-structure.md) - Venvs are part of project setup

**Why this matters for AI**:
- **TensorFlow** and **PyTorch** have complex dependencies - venv prevents conflicts
- **Jupyter notebooks** work better with project-specific venvs
- **Model training** needs reproducible environments
- **Deployment** requires knowing exact package versions

**Next steps**:
- [Package Management](./03-pip-poetry.md) - Learn pip and how to save dependencies

## Deep Dive Questions (Expert Level)

> These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:
1. How do virtual environments work under the hood? What files does the `activate` script modify?
2. What is `sys.path` and how does it change in a virtual environment? Try: `python -c "import sys; print(sys.path)"`

**Production Scenarios**:
1. How do you manage virtual environments in Docker containers? Should you use venvs in Docker?
2. What's the best practice for sharing virtual environment specifications across teams (requirements.txt vs Pipfile vs poetry.lock)?

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#packaging) for comprehensive list

## Summary

**In 3 sentences**:
- Virtual environments isolate Python packages for each project, preventing version conflicts
- Create with `python3 -m venv venv`, activate with `source venv/bin/activate` (or `venv\Scripts\activate` on Windows)
- Always activate venv BEFORE installing packages, and don't commit venv folder to git

**Key takeaway**: Think of venvs like separate JDK installations for different Java projects - each project gets its own clean environment with exactly the packages it needs!
