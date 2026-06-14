#!/bin/bash
echo ""
echo "  ========================================"
echo "    SAAS OPTIMIZER v3.0"
echo "    App para Clientes"
echo "  ========================================"
echo ""
if ! command -v node &> /dev/null; then echo "Node.js required"; exit 1; fi
if [ ! -d "node_modules" ]; then npm install --loglevel=error; fi
echo "  http://localhost:3000"
echo "  Demo: demo@saasopt.com"
echo ""
node server.js
