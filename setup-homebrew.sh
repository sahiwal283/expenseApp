#!/bin/bash

# Homebrew PATH Setup Helper Script
# This script helps configure Homebrew in your PATH after installation

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════╗"
echo "║   Homebrew PATH Setup Helper           ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Detect shell
CURRENT_SHELL=$(basename "$SHELL")
echo -e "${BLUE}Detected shell: ${CURRENT_SHELL}${NC}"
echo ""

# Determine shell config file
case "$CURRENT_SHELL" in
    "bash")
        SHELL_CONFIG="$HOME/.bash_profile"
        if [ ! -f "$SHELL_CONFIG" ]; then
            SHELL_CONFIG="$HOME/.bashrc"
        fi
        ;;
    "zsh")
        SHELL_CONFIG="$HOME/.zshrc"
        ;;
    *)
        SHELL_CONFIG="$HOME/.profile"
        ;;
esac

echo -e "${BLUE}Shell configuration file: ${SHELL_CONFIG}${NC}"
echo ""

# Check if Homebrew is installed
if [ -x "/opt/homebrew/bin/brew" ] || [ -x "/usr/local/bin/brew" ]; then
    echo -e "${GREEN}✓ Homebrew is installed${NC}"
    echo ""
    
    # Determine Homebrew location
    if [ -x "/opt/homebrew/bin/brew" ]; then
        BREW_PATH="/opt/homebrew/bin/brew"
    else
        BREW_PATH="/usr/local/bin/brew"
    fi
    
    # Check if brew is in PATH
    if command -v brew &> /dev/null; then
        echo -e "${GREEN}✓ Homebrew is already in your PATH${NC}"
        echo ""
        BREW_VERSION=$(brew --version | head -n1)
        echo -e "${BLUE}${BREW_VERSION}${NC}"
        echo ""
        
        # Ask if user wants to install Node.js
        echo -e "${YELLOW}Would you like to install Node.js now? (y/n)${NC}"
        read -p "> " INSTALL_NODE
        
        if [[ "$INSTALL_NODE" =~ ^[Yy]$ ]]; then
            echo ""
            echo -e "${BLUE}Installing Node.js...${NC}"
            brew install node
            
            if [ $? -eq 0 ]; then
                echo ""
                echo -e "${GREEN}✓ Node.js installed successfully!${NC}"
                NODE_VERSION=$(node -v)
                NPM_VERSION=$(npm -v)
                echo -e "${GREEN}  Node.js: ${NODE_VERSION}${NC}"
                echo -e "${GREEN}  npm: ${NPM_VERSION}${NC}"
                echo ""
                echo -e "${BLUE}You can now run the frontend:${NC}"
                echo "  ./start-frontend.sh"
            else
                echo ""
                echo -e "${RED}✗ Node.js installation failed${NC}"
                echo "Try running manually: brew install node"
            fi
        fi
    else
        echo -e "${YELLOW}⚠ Homebrew is not in your PATH${NC}"
        echo ""
        echo -e "${BLUE}To fix this, we need to add Homebrew to your shell configuration.${NC}"
        echo ""
        echo -e "${YELLOW}Would you like to add Homebrew to your PATH now? (y/n)${NC}"
        read -p "> " ADD_PATH
        
        if [[ "$ADD_PATH" =~ ^[Yy]$ ]]; then
            # Add Homebrew to PATH
            BREW_SHELLENV='eval "$('$BREW_PATH' shellenv)"'
            
            # Check if already in config
            if grep -q "brew shellenv" "$SHELL_CONFIG" 2>/dev/null; then
                echo ""
                echo -e "${YELLOW}Homebrew PATH already exists in ${SHELL_CONFIG}${NC}"
            else
                echo ""
                echo -e "${BLUE}Adding Homebrew to ${SHELL_CONFIG}...${NC}"
                echo "" >> "$SHELL_CONFIG"
                echo "# Homebrew" >> "$SHELL_CONFIG"
                echo "$BREW_SHELLENV" >> "$SHELL_CONFIG"
                echo -e "${GREEN}✓ Added to ${SHELL_CONFIG}${NC}"
            fi
            
            # Load in current session
            echo ""
            echo -e "${BLUE}Loading Homebrew in current session...${NC}"
            eval "$($BREW_PATH shellenv)"
            
            if command -v brew &> /dev/null; then
                echo -e "${GREEN}✓ Homebrew is now available!${NC}"
                echo ""
                
                BREW_VERSION=$(brew --version | head -n1)
                echo -e "${BLUE}${BREW_VERSION}${NC}"
                echo ""
                
                # Ask about Node.js installation
                echo -e "${YELLOW}Would you like to install Node.js now? (y/n)${NC}"
                read -p "> " INSTALL_NODE
                
                if [[ "$INSTALL_NODE" =~ ^[Yy]$ ]]; then
                    echo ""
                    echo -e "${BLUE}Installing Node.js...${NC}"
                    brew install node
                    
                    if [ $? -eq 0 ]; then
                        echo ""
                        echo -e "${GREEN}✓ Node.js installed successfully!${NC}"
                        NODE_VERSION=$(node -v)
                        NPM_VERSION=$(npm -v)
                        echo -e "${GREEN}  Node.js: ${NODE_VERSION}${NC}"
                        echo -e "${GREEN}  npm: ${NPM_VERSION}${NC}"
                        echo ""
                        echo -e "${BLUE}You can now run the frontend:${NC}"
                        echo "  ./start-frontend.sh"
                    else
                        echo ""
                        echo -e "${RED}✗ Node.js installation failed${NC}"
                        echo "Try running manually: brew install node"
                    fi
                else
                    echo ""
                    echo -e "${BLUE}To install Node.js later, run:${NC}"
                    echo "  brew install node"
                fi
            else
                echo -e "${RED}✗ Could not load Homebrew${NC}"
                echo ""
                echo -e "${YELLOW}Please close and reopen your terminal, then run:${NC}"
                echo "  brew install node"
            fi
        else
            echo ""
            echo -e "${BLUE}To add Homebrew to PATH manually:${NC}"
            echo ""
            echo "1. Add this line to ${SHELL_CONFIG}:"
            echo "   $BREW_SHELLENV"
            echo ""
            echo "2. Reload your shell:"
            echo "   source ${SHELL_CONFIG}"
            echo ""
            echo "3. Install Node.js:"
            echo "   brew install node"
        fi
    fi
else
    echo -e "${RED}✗ Homebrew is not installed${NC}"
    echo ""
    echo -e "${BLUE}To install Homebrew:${NC}"
    echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    echo ""
    echo -e "${YELLOW}After installation, run this script again:${NC}"
    echo "  ./setup-homebrew.sh"
fi

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   Setup Complete                       ║"
echo "╚════════════════════════════════════════╝"
