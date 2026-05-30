.PHONY: build install deploy clean dev

install:
	@echo "Installing dependencies..."
	npm install

dev:
	@echo "Starting development server..."
	npm run dev

build:
	@echo "Building application..."
	npm run build

clean:
	@echo "Cleaning up build artifacts..."
	rm -rf dist/
	rm -rf node_modules/

deploy: build
	@echo "Running deployment script..."
	bash scripts/deploy.sh
