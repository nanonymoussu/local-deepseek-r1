# Install Deepseek Locally

1. Clone repository:

```bash
git clone
```

2. Run the two apps from Docker Compose:

```bash
docker compose up -d
```

3. Install the Deepseek models: (This might take a few minutes)

```bash
docker compose exec ollama ollama pull deepseek-r1:8b
```

4. Run the website on [http://localhost:3001](http://localhost:3001)
