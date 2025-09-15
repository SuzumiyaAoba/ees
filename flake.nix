{
  description = "EES - Embeddings API Service";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # Node.js dependencies for the project
        nodejs = pkgs.nodejs_20;

        # Package the EES application
        ees-app = pkgs.buildNpmPackage {
          pname = "ees";
          version = "1.0.0";

          src = ./.;

          npmDepsHash = "sha256-Rd3rHasxABdH7bDkktkH3jNJSvyzA9vQoC1tE9i29Zw=";

          # Don't run build in buildPhase, it will be handled automatically
          dontNpmBuild = false;

          installPhase = ''
            mkdir -p $out/bin $out/lib/ees

            # Copy built application and dependencies
            cp -r dist $out/lib/ees/
            cp -r node_modules $out/lib/ees/
            cp package.json $out/lib/ees/

            # Create wrapper script
            cat > $out/bin/ees << EOF
            #!/bin/sh
            cd $out/lib/ees
            exec ${nodejs}/bin/node dist/index.js "\$@"
            EOF
            chmod +x $out/bin/ees
          '';

          meta = {
            description = "Embeddings API Service with Ollama and libSQL";
            license = pkgs.lib.licenses.mit;
          };
        };

        # Development environment with all dependencies
        devEnv = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Node.js and package managers
            nodejs
            corepack

            # Database and AI tools
            # Note: libsql not available in nixpkgs, using sqlite for development
            ollama
            sqlite

            # Development tools
            git
            curl
            jq

            # Additional useful tools
            htop
            tree
            ripgrep
          ];

          shellHook = ''
            echo "🚀 Welcome to the EES development environment!"
            echo ""
            echo "📦 Node.js version: $(node --version)"
            echo "📦 npm version: $(npm --version)"
            echo "🗄️  SQLite version: $(sqlite3 --version)"
            echo "🤖 Ollama version: $(ollama --version)"
            echo ""

            # Enable corepack for yarn/pnpm support (skip if it fails in Nix environment)
            corepack enable 2>/dev/null || echo "⚠️  Corepack enable failed (expected in Nix environment)"

            # Install dependencies if node_modules doesn't exist
            if [ ! -d "node_modules" ]; then
              echo "📦 Installing dependencies..."
              npm install
            fi

            # Setup git hooks if not already done
            if [ ! -d ".husky/_" ]; then
              echo "🪝 Setting up git hooks..."
              npm run prepare
            fi

            # Check if Ollama service is running, start if needed
            if ! pgrep -x "ollama" > /dev/null; then
              echo "🤖 Starting Ollama service..."
              ollama serve &
              sleep 2
            fi

            # Create data directory for libSQL if it doesn't exist
            if [ ! -d "data" ]; then
              echo "🗄️  Creating data directory for libSQL..."
              mkdir -p data
            fi

            echo ""
            echo "✅ Development environment ready!"
            echo ""
            echo "Available commands:"
            echo "  npm run dev     - Start development server"
            echo "  npm run build   - Build for production"
            echo "  npm test        - Run tests"
            echo "  npm run lint    - Check code quality"
            echo "  npm run format  - Format code"
            echo ""
            echo "API Server commands:"
            echo "  nix run         - Run the EES API server"
            echo "  nix build       - Build the EES package"
            echo ""
            echo "Database & AI tools:"
            echo "  sqlite3         - SQLite CLI"
            echo "  ollama list     - List available models"
            echo "  ollama pull     - Download AI models"
            echo ""
          '';

          # Environment variables
          NODE_ENV = "development";

          # Prevent npm from checking for updates
          NO_UPDATE_NOTIFIER = "1";
        };

        # Production server script
        serverScript = pkgs.writeShellScriptBin "ees-server" ''
          set -euo pipefail

          echo "🚀 Starting EES API Server..."
          echo ""

          # Set up data directory in current working directory
          export EES_DATA_DIR="$(pwd)/data"

          # Check if Ollama is available
          if ! command -v ollama &> /dev/null; then
            echo "❌ Ollama is not available. Please install Ollama first."
            exit 1
          fi

          # Start Ollama service if not running
          if ! pgrep -x "ollama" > /dev/null; then
            echo "🤖 Starting Ollama service..."
            ollama serve &
            sleep 3
          fi

          # Create data directory if it doesn't exist
          if [ ! -d "$EES_DATA_DIR" ]; then
            echo "🗄️  Creating data directory at $EES_DATA_DIR..."
            mkdir -p "$EES_DATA_DIR"
          fi

          # Check if required model is available
          MODEL_NAME="embeddinggemma:300m"
          if ! ollama list | grep -q "$MODEL_NAME"; then
            echo "📥 Model $MODEL_NAME not found. Pulling model..."
            ollama pull "$MODEL_NAME"
          fi

          echo ""
          echo "✅ All dependencies ready!"
          echo "🗄️  Database will be stored at: $EES_DATA_DIR/embeddings.db"
          echo "🌐 Starting EES API server on http://localhost:''${PORT:-3001}"
          echo ""

          # Start the server
          export NODE_ENV=production
          export PORT=''${PORT:-3001}

          ${ees-app}/bin/ees
        '';
      in
      {
        # Default package
        packages.default = ees-app;
        packages.ees = ees-app;
        packages.server = serverScript;

        # Development shell
        devShells.default = devEnv;

        # Apps for easy running
        apps = {
          default = {
            type = "app";
            program = "${serverScript}/bin/ees-server";
          };

          server = {
            type = "app";
            program = "${serverScript}/bin/ees-server";
          };

          dev = {
            type = "app";
            program = "${pkgs.writeShellScript "dev-server" ''
              if [ ! -d "node_modules" ]; then
                echo "Installing dependencies..."
                ${nodejs}/bin/npm install
              fi
              exec ${nodejs}/bin/npm run dev
            ''}";
          };
        };

        # Formatter
        formatter = pkgs.nixpkgs-fmt;
      }
    );
}