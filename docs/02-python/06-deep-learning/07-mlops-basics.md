# MLOps Basics: Productionizing Machine Learning

> **Before you start**: You should understand ML model training (`02-neural-networks-deep-dive.md`) and deployment (`06-model-deployment.md`). Familiarity with Git, Docker, and CI/CD concepts is helpful.

## What is MLOps?

MLOps (Machine Learning Operations) is the practice of applying DevOps principles to machine learning systems—automating and streamlining the ML lifecycle from experimentation to production deployment, monitoring, and retraining. It bridges the gap between data science experimentation and reliable production systems.

**Simple analogy**: If ML is cooking recipes in your home kitchen, MLOps is running a restaurant chain with consistent quality, inventory management, staff training, and customer feedback loops.

## Why This Matters

- **Production reality**: 87% of ML projects never make it to production (MLOps fixes this)
- **Job market**: MLOps engineer is one of the fastest-growing roles
- **System reliability**: Deployed models degrade over time without MLOps
- **Team collaboration**: Enables data scientists, engineers, and ops to work together
- **Interview essential**: Senior ML roles expect MLOps knowledge

## Traditional Software vs MLOps

| Aspect | Software Engineering | MLOps (ML Engineering) |
|--------|----------------------|------------------------|
| **Artifacts** | Code | Code + Data + Models |
| **Testing** | Unit, integration tests | + Data validation, model evaluation |
| **Versioning** | Git (code) | Git + DVC (data/models) |
| **Deployment** | Binary, container | Model + preprocessing + infrastructure |
| **Monitoring** | Logs, uptime, latency | + Model accuracy, data drift |
| **Degradation** | Code doesn't change | Models degrade over time |
| **Reproducibility** | Git commit | Commit + data version + random seed + environment |

## The MLOps Lifecycle

```
1. Experiment Tracking    → Log experiments, hyperparameters, metrics
2. Data Versioning        → Version datasets like code
3. Model Versioning       → Track model iterations
4. Pipeline Automation    → Automate training, testing, deployment
5. CI/CD for ML           → Continuous integration/deployment
6. Monitoring             → Track model performance in production
7. Retraining             → Automate model updates
8. Model Registry         → Central repository for models
```

## 1. Experiment Tracking

### Weights & Biases (wandb)

Industry standard for experiment tracking.

```python
import wandb
import torch
import torch.nn as nn

# Initialize wandb
wandb.init(
    project="image-classification",
    config={
        "learning_rate": 0.001,
        "batch_size": 32,
        "epochs": 10,
        "architecture": "ResNet50",
        "dataset": "CIFAR10"
    }
)

config = wandb.config

# Training loop
model = ResNet50()
optimizer = torch.optim.Adam(model.parameters(), lr=config.learning_rate)

for epoch in range(config.epochs):
    for batch_idx, (data, target) in enumerate(train_loader):
        # Training step
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()

        # Log metrics
        wandb.log({
            "train_loss": loss.item(),
            "epoch": epoch,
            "batch": batch_idx
        })

    # Validation
    val_loss, val_acc = validate(model, val_loader)

    # Log validation metrics
    wandb.log({
        "val_loss": val_loss,
        "val_accuracy": val_acc,
        "epoch": epoch
    })

    # Log model checkpoint
    if val_acc > best_acc:
        torch.save(model.state_dict(), 'best_model.pth')
        wandb.save('best_model.pth')

# Log final model
wandb.save('final_model.pth')

# Close wandb
wandb.finish()
```

**What wandb tracks**:
- Hyperparameters
- Metrics over time (loss, accuracy)
- System metrics (GPU usage, CPU, memory)
- Model checkpoints
- Code version (git commit)
- Visualizations (images, tables, plots)

**Benefits**:
- Compare 100s of experiments easily
- Share results with team
- Reproduce any experiment
- Find best hyperparameters

### MLflow

Alternative to wandb, self-hosted option.

```python
import mlflow
import mlflow.pytorch

# Start MLflow run
with mlflow.start_run():
    # Log parameters
    mlflow.log_param("learning_rate", 0.001)
    mlflow.log_param("batch_size", 32)
    mlflow.log_param("epochs", 10)

    # Training
    for epoch in range(10):
        loss = train_epoch(model, train_loader)

        # Log metrics
        mlflow.log_metric("train_loss", loss, step=epoch)
        mlflow.log_metric("val_accuracy", val_acc, step=epoch)

    # Log model
    mlflow.pytorch.log_model(model, "model")

    # Log artifacts (plots, files)
    mlflow.log_artifact("confusion_matrix.png")

# Query experiments
runs = mlflow.search_runs(experiment_ids=["1"])
best_run = runs.sort_values("metrics.val_accuracy", ascending=False).iloc[0]
print(f"Best run: {best_run.run_id}, Accuracy: {best_run['metrics.val_accuracy']}")
```

## 2. Data Versioning with DVC

Git for data and models.

```bash
# Install DVC
pip install dvc

# Initialize DVC in git repo
git init
dvc init

# Add data to DVC (not git)
dvc add data/train.csv

# This creates data/train.csv.dvc (tracked by git)
# Actual data goes to .dvc/cache (not in git)

# Commit the .dvc file
git add data/train.csv.dvc .gitignore
git commit -m "Add training data"

# Configure remote storage (S3, GCS, Azure, etc.)
dvc remote add -d storage s3://my-bucket/dvc-cache

# Push data to remote
dvc push

# Clone repo and get data
git clone <repo>
dvc pull  # Downloads actual data
```

**DVC for ML pipelines**:

```yaml
# dvc.yaml - Define ML pipeline
stages:
  prepare:
    cmd: python prepare_data.py
    deps:
      - data/raw.csv
    outs:
      - data/processed.csv

  train:
    cmd: python train.py
    deps:
      - data/processed.csv
      - train.py
    params:
      - train.learning_rate
      - train.epochs
    outs:
      - models/model.pth
    metrics:
      - metrics.json:
          cache: false

  evaluate:
    cmd: python evaluate.py
    deps:
      - models/model.pth
      - data/test.csv
    metrics:
      - eval_metrics.json:
          cache: false
```

```bash
# Run pipeline
dvc repro

# Compare experiments
dvc params diff
dvc metrics diff

# Visualize pipeline
dvc dag
```

## 3. Model Registry

Central repository for trained models.

```python
import mlflow

# Register model
model_uri = f"runs:/{run_id}/model"
mlflow.register_model(model_uri, "image_classifier")

# Transition model to production
client = mlflow.tracking.MlflowClient()
client.transition_model_version_stage(
    name="image_classifier",
    version=3,
    stage="Production"
)

# Load production model
model = mlflow.pyfunc.load_model(
    model_uri="models:/image_classifier/Production"
)

# Use model
predictions = model.predict(data)
```

**Model stages**:
- **None**: Initial state
- **Staging**: Testing in staging environment
- **Production**: Live in production
- **Archived**: Deprecated models

## 4. CI/CD for Machine Learning

### GitHub Actions for ML

```yaml
# .github/workflows/ml_pipeline.yml
name: ML Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  data_validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9

      - name: Install dependencies
        run: |
          pip install -r requirements.txt

      - name: Validate data schema
        run: |
          python validate_data.py

      - name: Check data quality
        run: |
          python check_data_quality.py

  train_model:
    needs: data_validation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Set up Python
        uses: actions/setup-python@v2

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Train model
        run: |
          python train.py --config config.yaml

      - name: Evaluate model
        run: |
          python evaluate.py --model models/model.pth

      - name: Check model performance
        run: |
          python check_metrics.py --threshold 0.85

  build_and_push:
    needs: train_model
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Build Docker image
        run: |
          docker build -t mymodel:${{ github.sha }} .

      - name: Push to registry
        run: |
          docker push mymodel:${{ github.sha }}

  deploy:
    needs: build_and_push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to staging
        run: |
          kubectl set image deployment/model-api \
            model=mymodel:${{ github.sha }}
```

### Model Testing

```python
# test_model.py
import pytest
import torch

def test_model_output_shape():
    """Test model outputs correct shape"""
    model = load_model('model.pth')
    input = torch.randn(1, 3, 224, 224)
    output = model(input)

    assert output.shape == (1, 10), f"Expected (1, 10), got {output.shape}"

def test_model_outputs_probabilities():
    """Test outputs are valid probabilities"""
    model = load_model('model.pth')
    input = torch.randn(1, 3, 224, 224)
    output = torch.softmax(model(input), dim=1)

    assert torch.all(output >= 0), "Outputs should be >= 0"
    assert torch.all(output <= 1), "Outputs should be <= 1"
    assert torch.allclose(output.sum(), torch.tensor(1.0)), "Should sum to 1"

def test_model_accuracy_threshold():
    """Test model meets minimum accuracy"""
    model = load_model('model.pth')
    accuracy = evaluate(model, test_loader)

    assert accuracy >= 0.85, f"Accuracy {accuracy} below threshold 0.85"

def test_inference_speed():
    """Test inference is fast enough"""
    import time

    model = load_model('model.pth')
    input = torch.randn(1, 3, 224, 224)

    start = time.time()
    _ = model(input)
    latency = time.time() - start

    assert latency < 0.1, f"Inference too slow: {latency}s (max 0.1s)"

def test_model_robustness():
    """Test model handles edge cases"""
    model = load_model('model.pth')

    # Test with zeros
    output = model(torch.zeros(1, 3, 224, 224))
    assert not torch.isnan(output).any(), "Model outputs NaN on zero input"

    # Test with ones
    output = model(torch.ones(1, 3, 224, 224))
    assert not torch.isnan(output).any(), "Model outputs NaN on ones input"
```

## 5. Data Validation

Ensure data quality before training.

```python
# Using Great Expectations
import great_expectations as ge

# Load data
df = ge.read_csv('data/train.csv')

# Define expectations
df.expect_column_values_to_not_be_null('label')
df.expect_column_values_to_be_in_set('label', [0, 1, 2, 3, 4])
df.expect_column_mean_to_be_between('pixel_value', min_value=0, max_value=255)
df.expect_table_row_count_to_be_between(min_value=10000, max_value=100000)

# Validate
results = df.validate()

if not results['success']:
    raise ValueError(f"Data validation failed: {results}")
```

**Custom validation**:

```python
def validate_data(df):
    """Custom data validation"""
    errors = []

    # Check for duplicates
    if df.duplicated().any():
        errors.append("Dataset contains duplicates")

    # Check class balance
    class_counts = df['label'].value_counts()
    min_count = class_counts.min()
    max_count = class_counts.max()

    if max_count / min_count > 10:
        errors.append(f"Severe class imbalance: {class_counts.to_dict()}")

    # Check for missing values
    if df.isnull().any().any():
        errors.append("Dataset contains missing values")

    # Check data types
    if df['image_path'].dtype != 'object':
        errors.append("image_path should be string")

    if errors:
        raise ValueError(f"Validation failed:\n" + "\n".join(errors))

    return True
```

## 6. Model Monitoring in Production

### Tracking Predictions

```python
from datetime import datetime
import json

class PredictionLogger:
    def __init__(self, log_file='predictions.jsonl'):
        self.log_file = log_file

    def log_prediction(self, input_data, prediction, confidence, metadata=None):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'prediction': prediction,
            'confidence': float(confidence),
            'input_hash': hash(str(input_data)),
            'metadata': metadata or {}
        }

        with open(self.log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')

# Usage in API
logger = PredictionLogger()

@app.post("/predict")
async def predict(image: UploadFile):
    # Make prediction
    prediction, confidence = model.predict(image)

    # Log
    logger.log_prediction(
        input_data=image,
        prediction=prediction,
        confidence=confidence,
        metadata={
            'user_id': request.user_id,
            'model_version': 'v2.1'
        }
    )

    return {"prediction": prediction, "confidence": confidence}
```

### Monitoring Model Performance

```python
import pandas as pd
from datetime import datetime, timedelta

class ModelMonitor:
    def __init__(self, predictions_file='predictions.jsonl'):
        self.predictions_file = predictions_file

    def get_recent_metrics(self, hours=24):
        """Get model performance metrics for last N hours"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)

        # Load predictions
        predictions = []
        with open(self.predictions_file) as f:
            for line in f:
                pred = json.loads(line)
                if datetime.fromisoformat(pred['timestamp']) > cutoff:
                    predictions.append(pred)

        if not predictions:
            return None

        # Calculate metrics
        df = pd.DataFrame(predictions)

        return {
            'total_predictions': len(df),
            'avg_confidence': df['confidence'].mean(),
            'low_confidence_rate': (df['confidence'] < 0.7).mean(),
            'prediction_distribution': df['prediction'].value_counts().to_dict()
        }

    def detect_anomalies(self):
        """Detect unusual patterns"""
        metrics = self.get_recent_metrics()

        alerts = []

        # Alert if too many low-confidence predictions
        if metrics['low_confidence_rate'] > 0.3:
            alerts.append(f"High low-confidence rate: {metrics['low_confidence_rate']:.2%}")

        # Alert if prediction distribution is skewed
        dist = metrics['prediction_distribution']
        if max(dist.values()) / sum(dist.values()) > 0.8:
            alerts.append(f"Skewed predictions: {dist}")

        return alerts

# Run monitoring
monitor = ModelMonitor()
alerts = monitor.detect_anomalies()

if alerts:
    # Send alert (email, Slack, PagerDuty)
    send_alert(alerts)
```

### Data Drift Detection

```python
from scipy.stats import ks_2samp
import numpy as np

class DriftMonitor:
    def __init__(self, reference_data):
        """
        reference_data: Training data statistics
        """
        self.reference_data = reference_data

    def check_drift(self, production_data, feature_name):
        """
        Check if production data has drifted from training data
        """
        # Kolmogorov-Smirnov test
        stat, p_value = ks_2samp(
            self.reference_data[feature_name],
            production_data[feature_name]
        )

        # p_value < 0.05 indicates significant drift
        return {
            'feature': feature_name,
            'drift_detected': p_value < 0.05,
            'p_value': p_value,
            'statistic': stat
        }

    def monitor_all_features(self, production_data):
        """Check drift across all features"""
        results = []

        for feature in self.reference_data.columns:
            drift_result = self.check_drift(production_data, feature)
            results.append(drift_result)

            if drift_result['drift_detected']:
                print(f"⚠️  Drift detected in {feature}: p={drift_result['p_value']:.4f}")

        return results

# Usage
drift_monitor = DriftMonitor(training_data)
drift_results = drift_monitor.monitor_all_features(recent_production_data)

# If drift detected, trigger retraining
if any(r['drift_detected'] for r in drift_results):
    trigger_retraining_pipeline()
```

## 7. Automated Retraining

```python
# retraining_pipeline.py
import schedule
import time

def check_and_retrain():
    """Check if retraining is needed and trigger it"""

    # Check model performance
    recent_accuracy = get_recent_accuracy()

    # Check data drift
    drift_detected = check_for_drift()

    # Check data volume
    new_data_count = get_new_labeled_data_count()

    should_retrain = (
        recent_accuracy < 0.85 or
        drift_detected or
        new_data_count > 10000
    )

    if should_retrain:
        print("Triggering retraining...")

        # Pull latest data
        data = load_latest_data()

        # Train new model
        new_model = train_model(data)

        # Evaluate
        metrics = evaluate_model(new_model)

        # Compare with production model
        prod_model = load_production_model()
        prod_metrics = evaluate_model(prod_model)

        if metrics['accuracy'] > prod_metrics['accuracy']:
            # Deploy new model
            deploy_model(new_model, stage='staging')

            # Run A/B test
            run_ab_test(prod_model, new_model, duration_hours=24)

            # If successful, promote to production
            promote_to_production(new_model)
        else:
            print("New model not better than production. Skipping deployment.")

# Schedule retraining check
schedule.every().day.at("02:00").do(check_and_retrain)

while True:
    schedule.run_pending()
    time.sleep(60)
```

## 8. ML System Architecture

### Complete MLOps Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Data Sources                           │
│         (Databases, APIs, Logs, User Interactions)          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Pipeline                               │
│  ┌──────────┐   ┌──────────┐   ┌───────────┐               │
│  │ Ingestion│──▶│Validation│──▶│Versioning │               │
│  └──────────┘   └──────────┘   └───────────┘               │
│                                  (DVC, S3)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Training Pipeline                               │
│  ┌──────────┐   ┌─────────┐   ┌────────────┐               │
│  │ Feature  │──▶│Training │──▶│ Evaluation │               │
│  │  Eng.    │   │         │   │            │               │
│  └──────────┘   └─────────┘   └────────────┘               │
│       │             │                │                       │
│       │             └────────────────┴──────────┐            │
│       │                                         ▼            │
│       │                              ┌─────────────────┐    │
│       └─────────────────────────────▶│ Experiment      │    │
│                                      │ Tracking (W&B)  │    │
│                                      └─────────────────┘    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Model Registry                               │
│         (MLflow, Model versioning, Staging)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Deployment Pipeline                             │
│  ┌──────────┐   ┌──────────┐   ┌─────────────┐             │
│  │  Model   │──▶│Container │──▶│  Serving    │             │
│  │ Package  │   │  (Docker)│   │ (FastAPI)   │             │
│  └──────────┘   └──────────┘   └─────────────┘             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Production                                   │
│  ┌──────────┐   ┌──────────┐   ┌─────────────┐             │
│  │   API    │──▶│Monitoring│──▶│   Alerts    │             │
│  │          │   │          │   │             │             │
│  └──────────┘   └──────────┘   └─────────────┘             │
│       │                                                      │
│       └─────────────┐                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
                      └───── Feedback Loop ─────────┐
                                                     │
                      ┌──────────────────────────────┘
                      ▼
              (Trigger Retraining)
```

## Best Practices

### 1. Reproducibility Checklist

```python
# Set all random seeds
import random
import numpy as np
import torch

def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

set_seed(42)

# Log everything
config = {
    'seed': 42,
    'python_version': sys.version,
    'pytorch_version': torch.__version__,
    'cuda_version': torch.version.cuda,
    'git_commit': get_git_commit(),
    'data_version': 'v2.1',
    'model_architecture': 'ResNet50',
    # ... all hyperparameters
}
```

### 2. Model Cards

Document model details.

```yaml
# model_card.yaml
model_name: Image Classifier v2.1
model_type: ResNet50
task: Multi-class classification

training:
  dataset: CIFAR10
  training_samples: 50000
  validation_samples: 10000
  epochs: 50
  final_accuracy: 0.923

performance:
  accuracy: 0.923
  precision: 0.920
  recall: 0.918
  f1_score: 0.919

limitations:
  - Lower accuracy on classes 3, 7
  - Sensitive to image quality
  - Not tested on out-of-distribution data

ethical_considerations:
  - Potential bias towards well-lit images
  - Should not be used for high-stakes decisions

maintenance:
  last_trained: 2024-01-15
  retraining_frequency: Monthly
  owner: ml-team@company.com
```

### 3. Gradual Rollouts

```python
class GradualRollout:
    def __init__(self):
        self.new_model_traffic = 0.0

    def should_use_new_model(self):
        return random.random() < self.new_model_traffic

    def increase_traffic(self, amount=0.1):
        """Increase traffic to new model by 10%"""
        self.new_model_traffic = min(1.0, self.new_model_traffic + amount)
        print(f"New model traffic: {self.new_model_traffic:.1%}")

# Day 1: 10% traffic
rollout.increase_traffic(0.1)

# Monitor metrics...
# If good, increase

# Day 2: 25% traffic
rollout.increase_traffic(0.15)

# Day 3: 50%
# Day 4: 100%
```

## Self-Check Questions

> Answer without looking back:

1. What's the difference between MLOps and DevOps?
2. Why is experiment tracking important?
3. What is data drift and why does it matter?
4. Explain the purpose of a model registry
5. What should ML CI/CD pipelines test?
6. When should you trigger model retraining?

## Practice Exercises

### Level 1: Understand
- Set up experiment tracking with wandb or MLflow
- Version a dataset with DVC
- Write unit tests for a trained model

### Level 2: Apply
- Build a complete ML pipeline with DVC
- Implement data validation checks
- Set up CI/CD for model training with GitHub Actions

### Level 3: Create
- Build a production ML system with monitoring
- Implement automated retraining pipeline
- Create drift detection and alerting system

## Common Mistakes

**Mistake 1: No experiment tracking**
```python
❌ Bad: Train 100 models, forget which one was best
✅ Good: Log every experiment with wandb/MLflow
```

**Mistake 2: Not versioning data**
```python
❌ Bad: "I trained on data.csv" (which version?)
✅ Good: Use DVC to version datasets
```

**Mistake 3: No model testing**
```python
❌ Bad: Deploy without testing
✅ Good: Test output shape, accuracy threshold, latency
```

## Interview Questions

### Knowledge
1. Explain the MLOps lifecycle end-to-end
2. How does model monitoring differ from application monitoring?
3. What causes model degradation in production?

### Scenario
1. Your model's accuracy dropped from 90% to 70% in production. Debug this.
2. You need to retrain weekly on new data. Design the pipeline.
3. How would you safely deploy a new model to production?

### Debugging
1. CI/CD pipeline passes but model fails in production. Why?
2. Retraining gives different results each time. Fix this.
3. Data drift detected but model still accurate. What to do?

## How This Connects

**Prerequisites**:
- `03-pytorch-fundamentals.md`: Model training
- `06-model-deployment.md`: Deployment strategies

**Next Steps**:
- Advanced MLOps: Feature stores, real-time ML
- ML platform engineering
- AutoML and hyperparameter optimization

## Summary

MLOps brings DevOps practices to machine learning, enabling reliable, reproducible, and scalable ML systems through experiment tracking (wandb, MLflow), data versioning (DVC), automated pipelines (CI/CD), model registries, production monitoring, and automated retraining. The MLOps lifecycle ensures models don't just work in notebooks but remain accurate and reliable in production, handling data drift, performance degradation, and continuous improvement. Mastering MLOps transforms data scientists into ML engineers who can ship and maintain production systems.

## Further Reading

- **"Machine Learning Engineering"** by Andriy Burkov
- **"Designing Machine Learning Systems"** by Chip Huyen
- **Google Cloud MLOps**: cloud.google.com/architecture/mlops-continuous-delivery
- **MLOps Community**: mlops.community
- **Papers**: "Hidden Technical Debt in Machine Learning Systems" (Google)
- **Courses**: Made With ML (madewithml.com), Full Stack Deep Learning
