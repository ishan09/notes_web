# Model Deployment: From Training to Production

> **Before you start**: You should have trained models (`02-neural-networks-deep-dive.md`, `03-pytorch-fundamentals.md`) and understand basic web APIs and Docker. This guide covers getting models into production.

## What is Model Deployment?

Model deployment is the process of making your trained machine learning model available for use in production—serving predictions to real users, applications, or systems. Training is 20% of the work; deployment, monitoring, and maintenance is the other 80%.

**Simple analogy**: Training a model is like learning to cook. Deployment is opening a restaurant—you need infrastructure, consistency, speed, quality control, and the ability to serve many customers simultaneously.

## Why This Matters

- **Real-world impact**: Models only create value when deployed and used
- **Career critical**: "Deploy ML models" is a top requirement in job descriptions
- **System design interviews**: ML system design questions focus heavily on deployment
- **DevOps integration**: Modern ML engineers must understand infrastructure

## Deployment vs Training

| Aspect | Training | Deployment |
|--------|----------|------------|
| **Environment** | Powerful GPU | CPU/GPU/Edge |
| **Latency** | Minutes/hours OK | Milliseconds required |
| **Batch size** | Large (32-256) | Often 1 (single prediction) |
| **Memory** | Lots available | Constrained |
| **Updates** | Frequent experiments | Controlled releases |
| **Monitoring** | Training metrics | Business metrics, latency, errors |

## The Deployment Pipeline

```
1. Model Export       → Save trained model in deployable format
2. Containerization   → Package model + dependencies (Docker)
3. Model Serving      → Set up inference server (REST API, gRPC)
4. Scalability        → Handle traffic (load balancing, auto-scaling)
5. Monitoring         → Track performance, errors, drift
6. CI/CD              → Automated testing and deployment
7. Rollback           → Quick reversion if issues occur
```

## Step 1: Model Export

### PyTorch: TorchScript

Serialize model for production (faster, no Python dependency).

```python
import torch

# Trained model
model = YourModel()
model.load_state_dict(torch.load('model_weights.pth'))
model.eval()

# Method 1: Tracing (for models without control flow)
example_input = torch.randn(1, 3, 224, 224)
traced_model = torch.jit.trace(model, example_input)
traced_model.save('model_traced.pt')

# Method 2: Scripting (handles control flow)
scripted_model = torch.jit.script(model)
scripted_model.save('model_scripted.pt')

# Load for inference
loaded_model = torch.jit.load('model_traced.pt')
loaded_model.eval()

# Inference
with torch.no_grad():
    output = loaded_model(example_input)
```

### ONNX (Cross-framework format)

Use model in C++, C#, Java, or other frameworks.

```python
import torch.onnx

model = YourModel()
model.eval()

dummy_input = torch.randn(1, 3, 224, 224)

# Export to ONNX
torch.onnx.export(
    model,
    dummy_input,
    "model.onnx",
    export_params=True,
    opset_version=11,
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={
        'input': {0: 'batch_size'},
        'output': {0: 'batch_size'}
    }
)

# Load and run with ONNX Runtime
import onnxruntime as ort

session = ort.InferenceSession("model.onnx")
inputs = {session.get_inputs()[0].name: dummy_input.numpy()}
outputs = session.run(None, inputs)
```

### TensorFlow: SavedModel

```python
import tensorflow as tf

# Save entire model
model.save('saved_model/')

# Load
loaded_model = tf.keras.models.load_model('saved_model/')

# Or save to TensorFlow Lite (for mobile/edge)
converter = tf.lite.TFLiteConverter.from_saved_model('saved_model/')
tflite_model = converter.convert()

with open('model.tflite', 'wb') as f:
    f.write(tflite_model)
```

## Step 2: REST API with FastAPI

Most common deployment method: Expose model as HTTP endpoint.

### Basic FastAPI Server

```python
from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
import torch
from PIL import Image
import io
import torchvision.transforms as transforms

# Initialize app
app = FastAPI(title="Image Classifier API")

# Load model (once at startup)
model = torch.jit.load('model_traced.pt')
model.eval()

# Preprocessing
transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

class PredictionResponse(BaseModel):
    class_id: int
    class_name: str
    confidence: float

@app.get("/")
def read_root():
    return {"message": "Image Classifier API is running"}

@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)):
    # Read image
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert('RGB')

    # Preprocess
    input_tensor = transform(image).unsqueeze(0)

    # Inference
    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
        confidence, class_id = torch.max(probabilities, 0)

    # Map class ID to name (example)
    class_names = ['cat', 'dog', 'bird', ...]
    class_name = class_names[class_id.item()]

    return PredictionResponse(
        class_id=class_id.item(),
        class_name=class_name,
        confidence=confidence.item()
    )

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Run: uvicorn main:app --host 0.0.0.0 --port 8000
```

### Testing the API

```python
# Client code
import requests

# Send image
with open('test_image.jpg', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/predict',
        files={'file': f}
    )

print(response.json())
# {'class_id': 0, 'class_name': 'cat', 'confidence': 0.987}
```

### Batch Prediction Endpoint

```python
from typing import List

class BatchPredictionRequest(BaseModel):
    texts: List[str]

@app.post("/predict_batch")
async def predict_batch(request: BatchPredictionRequest):
    # Tokenize all texts
    inputs = tokenizer(
        request.texts,
        padding=True,
        truncation=True,
        return_tensors='pt'
    )

    # Batch inference
    with torch.no_grad():
        outputs = model(**inputs)
        predictions = torch.argmax(outputs.logits, dim=1)

    return {
        "predictions": predictions.tolist()
    }
```

## Step 3: Model Serving Frameworks

### TorchServe (PyTorch official)

Production-ready serving for PyTorch models.

```bash
# Install
pip install torchserve torch-model-archiver torch-workflow-archiver

# Archive model
torch-model-archiver \
  --model-name image_classifier \
  --version 1.0 \
  --model-file model.py \
  --serialized-file model.pth \
  --handler image_classifier_handler.py \
  --export-path model_store

# Start server
torchserve --start \
  --model-store model_store \
  --models image_classifier=image_classifier.mar \
  --ncs
```

**Custom handler**:
```python
# image_classifier_handler.py
from torchvision import transforms
from ts.torch_handler.image_classifier import ImageClassifier

class CustomHandler(ImageClassifier):
    def __init__(self):
        super().__init__()
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

    def preprocess(self, data):
        # Custom preprocessing logic
        images = []
        for row in data:
            image = self.transform(row['data'])
            images.append(image)
        return torch.stack(images)
```

### TensorFlow Serving

```bash
# Pull Docker image
docker pull tensorflow/serving

# Serve model
docker run -p 8501:8501 \
  --mount type=bind,source=/path/to/model,target=/models/my_model \
  -e MODEL_NAME=my_model \
  -t tensorflow/serving
```

**Client**:
```python
import requests
import json

data = json.dumps({
    "signature_name": "serving_default",
    "instances": [[1.0, 2.0, 3.0, 4.0]]
})

headers = {"content-type": "application/json"}
response = requests.post(
    'http://localhost:8501/v1/models/my_model:predict',
    data=data,
    headers=headers
)

print(response.json())
```

## Step 4: Containerization with Docker

Package model + dependencies for consistent deployment.

### Dockerfile

```dockerfile
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy model and code
COPY model_traced.pt .
COPY main.py .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### requirements.txt

```
fastapi==0.104.1
uvicorn==0.24.0
torch==2.1.0
torchvision==0.16.0
pillow==10.1.0
python-multipart==0.0.6
```

### Build and Run

```bash
# Build image
docker build -t ml-model-api:v1 .

# Run container
docker run -p 8000:8000 ml-model-api:v1

# Test
curl http://localhost:8000/
```

### Docker Compose (Multi-service)

```yaml
# docker-compose.yml
version: '3.8'

services:
  model_api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - MODEL_PATH=/app/model_traced.pt
      - LOG_LEVEL=info
    volumes:
      - ./models:/app/models
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

  nginx:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - model_api
```

## Step 5: Cloud Deployment

### AWS SageMaker

```python
import sagemaker
from sagemaker.pytorch import PyTorchModel

# Package model
pytorch_model = PyTorchModel(
    model_data='s3://my-bucket/model.tar.gz',
    role='SageMakerRole',
    framework_version='2.0',
    py_version='py39',
    entry_point='inference.py'
)

# Deploy
predictor = pytorch_model.deploy(
    instance_type='ml.m5.large',
    initial_instance_count=1
)

# Predict
result = predictor.predict(data)
```

### Google Cloud Vertex AI

```python
from google.cloud import aiplatform

# Upload model
model = aiplatform.Model.upload(
    display_name='my_model',
    artifact_uri='gs://my-bucket/model/',
    serving_container_image_uri='gcr.io/cloud-aiplatform/prediction/pytorch-gpu.1-11:latest'
)

# Deploy to endpoint
endpoint = model.deploy(
    machine_type='n1-standard-4',
    min_replica_count=1,
    max_replica_count=5
)

# Predict
prediction = endpoint.predict(instances=[...])
```

### Azure ML

```python
from azureml.core import Workspace, Model
from azureml.core.webservice import AciWebservice, Webservice
from azureml.core.model import InferenceConfig

# Register model
model = Model.register(
    workspace=ws,
    model_path='./model.pkl',
    model_name='my_model'
)

# Deploy
deployment_config = AciWebservice.deploy_configuration(
    cpu_cores=1,
    memory_gb=1
)

service = Model.deploy(
    workspace=ws,
    name='my-service',
    models=[model],
    inference_config=inference_config,
    deployment_config=deployment_config
)

service.wait_for_deployment(show_output=True)
```

## Step 6: Optimization for Production

### 1. Model Quantization

Reduce model size and inference time.

```python
import torch

# Dynamic quantization (easiest)
model_fp32 = YourModel()
model_int8 = torch.quantization.quantize_dynamic(
    model_fp32,
    {torch.nn.Linear},  # Layers to quantize
    dtype=torch.qint8
)

# Model size: 100MB → 25MB (4x smaller)
# Inference: 100ms → 40ms (2.5x faster)

# Save quantized model
torch.save(model_int8.state_dict(), 'model_quantized.pth')
```

### 2. ONNX Runtime Optimization

```python
import onnxruntime as ort

# Enable optimizations
session_options = ort.SessionOptions()
session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

# Use GPU
providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']

session = ort.InferenceSession(
    "model.onnx",
    session_options,
    providers=providers
)

# Inference
outputs = session.run(None, {input_name: input_data})
```

### 3. Batching for Throughput

```python
from collections import deque
import asyncio
import time

class BatchPredictor:
    def __init__(self, model, max_batch_size=32, max_wait_ms=100):
        self.model = model
        self.max_batch_size = max_batch_size
        self.max_wait_ms = max_wait_ms
        self.queue = deque()

    async def predict(self, input_data):
        # Add to queue
        future = asyncio.Future()
        self.queue.append((input_data, future))

        # Wait for batch or timeout
        await self._process_batch()

        return await future

    async def _process_batch(self):
        await asyncio.sleep(self.max_wait_ms / 1000)

        if len(self.queue) == 0:
            return

        # Collect batch
        batch = []
        futures = []

        while len(batch) < self.max_batch_size and self.queue:
            data, future = self.queue.popleft()
            batch.append(data)
            futures.append(future)

        # Run inference
        batch_tensor = torch.stack(batch)
        with torch.no_grad():
            outputs = self.model(batch_tensor)

        # Distribute results
        for i, future in enumerate(futures):
            future.set_result(outputs[i])
```

### 4. Caching

```python
from functools import lru_cache
import hashlib

class CachedPredictor:
    def __init__(self, model, cache_size=1000):
        self.model = model
        self.cache = {}
        self.cache_size = cache_size

    def predict(self, input_data):
        # Create hash of input
        input_hash = hashlib.md5(input_data.tobytes()).hexdigest()

        # Check cache
        if input_hash in self.cache:
            return self.cache[input_hash]

        # Run inference
        output = self.model(input_data)

        # Cache result
        if len(self.cache) < self.cache_size:
            self.cache[input_hash] = output

        return output
```

## Step 7: Monitoring

### Basic Logging

```python
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.post("/predict")
async def predict(file: UploadFile):
    start_time = time.time()

    try:
        # ... inference code ...

        latency = time.time() - start_time

        logger.info(
            f"Prediction successful | "
            f"latency={latency:.3f}s | "
            f"class={class_name} | "
            f"confidence={confidence:.3f}"
        )

        return response

    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        raise
```

### Prometheus Metrics

```python
from prometheus_client import Counter, Histogram, generate_latest
from fastapi import Response

# Define metrics
prediction_counter = Counter(
    'predictions_total',
    'Total number of predictions',
    ['model_version', 'class']
)

prediction_latency = Histogram(
    'prediction_latency_seconds',
    'Prediction latency in seconds'
)

@app.post("/predict")
async def predict(file: UploadFile):
    with prediction_latency.time():
        # ... inference ...
        prediction_counter.labels(
            model_version='v1',
            class=class_name
        ).inc()

    return response

@app.get("/metrics")
async def metrics():
    return Response(
        content=generate_latest(),
        media_type="text/plain"
    )
```

### Data Drift Detection

```python
from scipy.stats import ks_2samp
import numpy as np

class DriftDetector:
    def __init__(self, reference_data):
        self.reference_data = reference_data

    def detect_drift(self, new_data, threshold=0.05):
        """
        Returns True if drift detected using Kolmogorov-Smirnov test
        """
        statistic, p_value = ks_2samp(
            self.reference_data,
            new_data
        )

        return p_value < threshold

# Usage
detector = DriftDetector(training_features)

if detector.detect_drift(recent_production_features):
    logger.warning("Data drift detected! Consider retraining.")
```

## Deployment Patterns

### A/B Testing

```python
import random

class ABTestingPredictor:
    def __init__(self, model_a, model_b, traffic_split=0.5):
        self.model_a = model_a
        self.model_b = model_b
        self.traffic_split = traffic_split

    def predict(self, input_data):
        # Randomly route traffic
        if random.random() < self.traffic_split:
            model_version = 'A'
            result = self.model_a(input_data)
        else:
            model_version = 'B'
            result = self.model_b(input_data)

        # Log for analysis
        logger.info(f"model_version={model_version}")

        return result
```

### Canary Deployment

```python
# Gradually increase traffic to new model
class CanaryDeployment:
    def __init__(self, old_model, new_model):
        self.old_model = old_model
        self.new_model = new_model
        self.new_model_traffic = 0.0  # Start at 0%

    def predict(self, input_data):
        if random.random() < self.new_model_traffic:
            return self.new_model(input_data)
        else:
            return self.old_model(input_data)

    def increase_traffic(self, increment=0.1):
        """Gradually increase traffic to new model"""
        self.new_model_traffic = min(1.0, self.new_model_traffic + increment)
```

### Shadow Deployment

```python
# Run new model in parallel, log results without serving
class ShadowDeployment:
    def __init__(self, production_model, shadow_model):
        self.production_model = production_model
        self.shadow_model = shadow_model

    async def predict(self, input_data):
        # Production prediction
        prod_result = self.production_model(input_data)

        # Shadow prediction (async, doesn't block)
        asyncio.create_task(self._shadow_predict(input_data, prod_result))

        return prod_result

    async def _shadow_predict(self, input_data, prod_result):
        shadow_result = self.shadow_model(input_data)

        # Compare and log
        logger.info(
            f"Shadow comparison | "
            f"prod={prod_result} | "
            f"shadow={shadow_result}"
        )
```

## Self-Check Questions

> Answer without looking back:

1. What's the difference between model training and deployment environments?
2. Why use ONNX instead of native PyTorch for deployment?
3. What is model quantization and what does it achieve?
4. Explain the difference between A/B testing and canary deployment
5. Why is monitoring critical for deployed models?
6. What is data drift and how do you detect it?

## Practice Exercises

### Level 1: Understand
- Create a FastAPI endpoint for a trained model
- Containerize a model with Docker
- Deploy a model locally and test with curl

### Level 2: Apply
- Deploy a model to AWS/GCP/Azure
- Implement batching for improved throughput
- Add Prometheus metrics to your API

### Level 3: Create
- Build a complete CI/CD pipeline for model deployment
- Implement A/B testing infrastructure
- Create a monitoring dashboard with drift detection

## Common Mistakes

**Mistake 1: Not handling errors gracefully**
```python
❌ Bad: Let exceptions crash the server
✅ Good: Catch errors, return meaningful responses
try:
    prediction = model(input)
except Exception as e:
    logger.error(f"Prediction failed: {e}")
    return {"error": "Prediction failed", "status": 500}
```

**Mistake 2: No input validation**
```python
❌ Bad: Accept any input
✅ Good: Validate input shape, type, range
if input.shape != (224, 224, 3):
    raise ValueError("Expected image of shape (224, 224, 3)")
```

**Mistake 3: Ignoring latency**
```python
❌ Bad: No timeouts, synchronous preprocessing
✅ Good: Async operations, timeouts, monitoring
async def predict(...):
    # Async preprocessing
    # Add timeout
    # Monitor latency
```

## Interview Questions

### Knowledge
1. Describe the model deployment pipeline end-to-end
2. Compare TorchServe, TensorFlow Serving, and custom FastAPI
3. What optimizations can reduce inference latency?

### Scenario
1. Your model API has high latency. How do you debug and fix?
2. You need to deploy to mobile devices. What approach?
3. Model accuracy dropped in production. What could cause this?

### Debugging
1. Docker container works locally but fails in production. Debug.
2. API returns correct results but very slowly. Optimize.
3. Model size is too large for deployment constraints. Solutions?

## How This Connects

**Prerequisites**:
- `03-pytorch-fundamentals.md`: Model training and saving
- Basic web development: APIs, HTTP
- DevOps basics: Docker, cloud platforms

**Next Steps**:
- `07-mlops-basics.md`: CI/CD, experiment tracking, model versioning
- Production monitoring and maintenance
- MLOps best practices

## Summary

Model deployment transforms trained models into production systems that serve predictions at scale, requiring careful consideration of latency, throughput, resource constraints, and monitoring. The deployment pipeline involves model export (TorchScript, ONNX), containerization (Docker), serving (FastAPI, TorchServe), cloud deployment (AWS, GCP, Azure), optimization (quantization, batching), and continuous monitoring for performance and data drift. Mastering deployment patterns like A/B testing, canary releases, and shadow deployments enables safe, gradual rollouts of new models while maintaining system reliability.

## Further Reading

- **FastAPI docs**: fastapi.tiangolo.com
- **TorchServe**: pytorch.org/serve
- **ML Engineering book**: "Machine Learning Engineering" by Andriy Burkov
- **Google MLOps**: cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning
- **AWS SageMaker**: docs.aws.amazon.com/sagemaker
