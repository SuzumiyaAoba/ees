{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    # Node.js and package managers
    nodejs_20
    corepack

    # Development tools
    git
    curl
    jq

    # Optional: useful for debugging and development
    htop
    tree
    ripgrep
  ];

  shellHook = ''
    echo "🚀 Welcome to the EES development environment!"
    echo ""
    echo "📦 Node.js version: $(node --version)"
    echo "📦 npm version: $(npm --version)"
    echo ""

    # Enable corepack for yarn/pnpm support
    corepack enable

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
  '';

  # Environment variables
  NODE_ENV = "development";

  # Prevent npm from checking for updates
  NO_UPDATE_NOTIFIER = "1";
}