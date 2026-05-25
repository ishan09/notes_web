# Package Management: pip & Poetry

> **Before you start**: Do you have a virtual environment activated? If not, review [Virtual Environments](./02-virtual-environments.md)

## What is Package Management?

Package management is how you **install, update, and manage external libraries** (packages) in Python. Think of it like Maven or Gradle for Java - tools that handle dependencies for you.

**Real-world analogy**: You're building a house. Instead of making your own bricks, windows, and doors, you order them from suppliers. Package managers are like the ordering system - they fetch the right materials (packages) in the right versions.

## Why This Matters for AI/ML

**You'll need package management for**:
- Installing ML libraries (numpy, pandas, scikit-learn, PyTorch, TensorFlow)
- Managing versions (ensure everyone on your team has the same setup)
- Reproducible experiments (same packages = same results)
- Easy deployment (install all dependencies with one command)

**AI/ML Context**: A typical ML project might need 50+ packages. Manually tracking versions is impossible. Package managers handle this automatically.

## Using pip (Python's Default Package Manager)

`pip` is Python's standard package manager - it comes with Python 3.4+.

### Basic pip Commands

```bash
# Install a package
pip install numpy

# Install specific version
pip install numpy==1.24.0

# Install minimum version
pip install numpy>=1.23.0

# Install multiple packages
pip install numpy pandas scikit-learn

# Upgrade a package
pip install --upgrade numpy

# Uninstall a package
pip uninstall numpy

# List installed packages
pip list

# Show package details
pip show numpy
```

### Installing from requirements.txt

A `requirements.txt` file lists all your project's dependencies:

```txt
# requirements.txt
numpy==1.24.0
pandas==2.0.0
scikit-learn==1.2.2
matplotlib==3.7.1
```

Install all at once:

```bash
pip install -r requirements.txt
```

### Creating requirements.txt

```bash
# Save ALL installed packages (including dependencies)
pip freeze > requirements.txt

# Or manually create/edit requirements.txt with only direct dependencies
# This is cleaner - only list what you actually import
echo "numpy>=1.24.0" > requirements.txt
echo "pandas>=2.0.0" >> requirements.txt
```

### Upgrading All Packages

```bash
# Linux/macOS
pip list --outdated | cut -d ' ' -f1 | xargs -n1 pip install -U

# Or upgrade one by one
pip install --upgrade numpy pandas scikit-learn
```

## Introduction to Poetry (Modern Alternative)

Poetry is a modern package manager that improves on pip. It's like going from Maven to Gradle in Java world.

### Why Poetry?

- **Better dependency resolution** (handles conflicts automatically)
- **Lock files** (exact versions, truly reproducible)
- **Project management** (creates project structure)
- **Publishing** (easy to publish your own packages)

### Installing Poetry

```bash
# macOS/Linux
curl -sSL https://install.python-poetry.org | python3 -

# Windows (PowerShell)
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | py -
```

### Basic Poetry Commands

```bash
# Create new project
poetry new my_ml_project

# Or initialize in existing directory
cd my_project
poetry init

# Add a package
poetry add numpy

# Add specific version
poetry add numpy==1.24.0

# Add dev dependency (only for development)
poetry add --group dev pytest

# Install all dependencies from poetry.lock
poetry install

# Update dependencies
poetry update

# Run commands in poetry's virtual environment
poetry run python script.py

# Activate poetry's shell
poetry shell
```

### Poetry Files

**pyproject.toml** - Your project configuration and dependencies:

```toml
[tool.poetry]
name = "my-ml-project"
version = "0.1.0"
description = "ML project"

[tool.poetry.dependencies]
python = "^3.11"
numpy = "^1.24.0"
pandas = "^2.0.0"

[tool.poetry.group.dev.dependencies]
pytest = "^7.3.0"
```

**poetry.lock** - Exact versions of ALL packages (including sub-dependencies). Commit this to git for reproducibility.

## Managing Dependencies

### pip Approach

```bash
# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install packages
pip install numpy pandas scikit-learn

# 3. Save dependencies
pip freeze > requirements.txt

# 4. Team member installs same versions
pip install -r requirements.txt
```

### Poetry Approach

```bash
# 1. Initialize project (creates venv automatically)
poetry init

# 2. Add packages (updates pyproject.toml and poetry.lock)
poetry add numpy pandas scikit-learn

# 3. Team member installs exact same versions
poetry install  # Reads poetry.lock
```

### Which Should You Use?

**Use pip if**:
- Simple projects
- Learning Python
- Quick experiments
- Team already uses pip

**Use Poetry if**:
- Complex projects with many dependencies
- Publishing packages
- Want better dependency resolution
- Building production applications

**For this course**: We'll use **pip** because it's built-in and simpler to learn. You can switch to Poetry later.

## Try It

**Exercise 1**: Install packages with pip

```bash
# Create and activate venv
mkdir test_pip && cd test_pip
python3 -m venv venv
source venv/bin/activate

# Install packages
pip install numpy pandas

# Check what's installed
pip list

# Create requirements.txt
pip freeze > requirements.txt

# Look at requirements.txt
cat requirements.txt

# Deactivate
deactivate
```

**Exercise 2**: Test requirements.txt in new environment

```bash
# Create new venv
cd ..
mkdir test_pip2 && cd test_pip2
python3 -m venv venv
source venv/bin/activate

# Copy requirements.txt from previous exercise
cp ../test_pip/requirements.txt .

# Install from requirements.txt
pip install -r requirements.txt

# Verify packages are installed
python -c "import numpy, pandas; print('Success!')"

deactivate
```

**Exercise 3**: Try Poetry (optional)

```bash
# Install Poetry first (if not installed)
curl -sSL https://install.python-poetry.org | python3 -

# Create new project
poetry new my_test_project
cd my_test_project

# Add packages
poetry add numpy pandas

# Check pyproject.toml
cat pyproject.toml

# Run Python in poetry environment
poetry run python -c "import numpy; print(numpy.__version__)"
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the difference between pip and Poetry?
2. **Why** do you need a requirements.txt file?
3. **When** should you use `pip install` vs `pip install -e`?
4. **How** do you handle dependency conflicts?
5. **Compare**: requirements.txt vs Pipfile vs pyproject.toml

<details>
<summary>Click to reveal answers</summary>

1. **pip** is Python's built-in package manager (simple, standard). **Poetry** is a modern alternative with better dependency resolution, lock files, and project management. pip uses requirements.txt, Poetry uses pyproject.toml + poetry.lock.

2. **requirements.txt lists all dependencies** so others can install the exact same packages with `pip install -r requirements.txt`. Without it, teammates would have to manually install each package, and might get different versions.

3. **`pip install package`** installs from PyPI (Python Package Index). **`pip install -e .`** (editable install) installs your local package in development mode - changes to source code take effect immediately without reinstalling. Use `-e` when developing your own package.

4. **Dependency conflicts** happen when Package A needs numpy>=1.24 but Package B needs numpy<1.24. **Solutions**: (1) Use Poetry (auto-resolves), (2) Upgrade packages, (3) Use different virtual environments, (4) Pin compatible versions manually, (5) Use Docker to isolate completely.

5. **requirements.txt** (pip, simple, lists packages). **Pipfile + Pipfile.lock** (pipenv tool, better than requirements.txt). **pyproject.toml + poetry.lock** (Poetry, most modern, includes project metadata). All serve same purpose: track dependencies. Lock files (Pipfile.lock, poetry.lock) pin exact versions for reproducibility.

</details>

## Practice Exercises

**Level 1 - Understand**:

Explore what pip does:

```bash
mkdir explore_pip && cd explore_pip
python3 -m venv venv
source venv/bin/activate

# Install numpy and see what else gets installed
pip install numpy
pip list  # Notice numpy + its dependencies

# See where packages are installed
pip show numpy  # Look for "Location"

deactivate
```

**Level 2 - Apply**:

Create a mini AI/ML environment:

```bash
mkdir ml_env && cd ml_env
python3 -m venv venv
source venv/bin/activate

# Install common ML packages
pip install numpy pandas scikit-learn matplotlib

# Save to requirements.txt
pip freeze > requirements.txt

# Test imports
python -c "import numpy, pandas, sklearn, matplotlib; print('ML environment ready!')"

deactivate
```

**Level 3 - Create**:

Create a script that sets up a complete ML environment:

<details>
<summary>Solution</summary>

Create `setup_ml_env.sh`:

```bash
#!/bin/bash

echo "Setting up ML environment..."

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Create requirements.txt with ML packages
cat > requirements.txt << EOF
numpy>=1.24.0
pandas>=2.0.0
scikit-learn>=1.2.0
matplotlib>=3.7.0
jupyter>=1.0.0
EOF

# Install packages
pip install -r requirements.txt

# Verify installation
python << EOF
import numpy as np
import pandas as pd
import sklearn
import matplotlib
import jupyter

print("✅ All packages installed successfully!")
print(f"   NumPy: {np.__version__}")
print(f"   Pandas: {pd.__version__}")
print(f"   Scikit-learn: {sklearn.__version__}")
EOF

echo "Environment ready! Activate with: source venv/bin/activate"
```

Make executable and run:
```bash
chmod +x setup_ml_env.sh
./setup_ml_env.sh
```

</details>

## Common Mistakes

❌ **Mistake 1**: Installing packages globally without venv

```bash
# Wrong - pollutes system Python
pip install numpy  # Goes to system Python

# Right - use venv first
python3 -m venv venv
source venv/bin/activate
pip install numpy
```

**Why it's wrong**: Global packages can break system tools, cause version conflicts across projects, and aren't reproducible.

✅ **Instead**: ALWAYS use virtual environments.

---

❌ **Mistake 2**: Not pinning versions in requirements.txt

```txt
# Bad requirements.txt
numpy
pandas
scikit-learn
```

**Why it's wrong**: Today numpy might be 1.24, next week 2.0 is released with breaking changes. Your code breaks.

✅ **Instead**: Pin versions:

```txt
# Good requirements.txt
numpy==1.24.3
pandas==2.0.2
scikit-learn==1.2.2
```

Or use minimum versions:
```txt
numpy>=1.24.0,<2.0.0
```

---

❌ **Mistake 3**: Committing virtual environment to git

```bash
# Wrong - venv/ in git
git add venv/  # Huge, machine-specific files
```

✅ **Instead**: Add to .gitignore, commit requirements.txt:

```bash
echo "venv/" >> .gitignore
git add requirements.txt .gitignore
git commit -m "Add dependencies"
```

---

❌ **Mistake 4**: Using `pip freeze` blindly

```bash
pip install numpy  # Also installs 10 sub-dependencies
pip freeze > requirements.txt  # Now requirements.txt has 11 packages!
```

**Why it's problematic**: Includes sub-dependencies. If numpy updates, it might need different sub-dependencies, but you've pinned them.

✅ **Better approach**: Manually list only direct dependencies:

```txt
# Only what you actually import
numpy==1.24.3
pandas==2.0.2
```

Or use `pip-tools` or Poetry which handle this better.

## How This Connects

**Builds on**:
- [Virtual Environments](./02-virtual-environments.md) - Always install packages in venvs

**Related concepts**:
- [Modules](../01-fundamentals/05-modules.md) - Import packages you install with pip
- [Project Structure](../04-testing-quality/03-project-structure.md) - requirements.txt goes in project root

**Why this matters for AI**:
- **ML projects** need 20-50 packages: numpy, pandas, scikit-learn, PyTorch/TensorFlow, matplotlib, jupyter, etc.
- **Version compatibility** matters: PyTorch 2.0 might not work with CUDA 11.7
- **Reproducibility** is critical: same packages = same model training results
- **Deployment**: requirements.txt lets you recreate environment on production servers

**Next steps**:
- [Python Syntax Basics](../01-fundamentals/01-syntax-basics.md) - Start coding with Python!

## Deep Dive Questions (Expert Level)

> These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:
1. How does pip resolve dependency conflicts? What happens when Package A needs numpy>=1.24 and Package B needs numpy<1.24?
2. What's the difference between `pip install package`, `pip install --user package`, and `pip install -e .`? When would you use each?

**Production Scenarios**:
1. How do you handle private package repositories in enterprise environments? (Hint: `pip install --index-url`)
2. What's the best practice for managing ML model dependencies in production? Docker? Poetry? Conda?

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#packaging) for comprehensive list

## Summary

**In 3 sentences**:
- Use `pip install package` to install libraries, `pip freeze > requirements.txt` to save dependencies, and `pip install -r requirements.txt` to install from saved list
- Always use virtual environments before installing packages to avoid global pollution and version conflicts
- Pin specific versions in requirements.txt for reproducibility (e.g., `numpy==1.24.3` not just `numpy`)

**Key takeaway**: pip + requirements.txt is like Maven's pom.xml or Gradle's build.gradle - it manages your project's dependencies so everyone has the same setup!
