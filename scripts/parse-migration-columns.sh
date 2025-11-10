#!/bin/bash

#############################################################
# Migration Column Parser Helper
# Extracts detailed column information from SQL migration files
# Used by validate-schema.sh for detailed column comparison
#############################################################

# Usage: ./parse-migration-columns.sh <table_name> <migration_file>

TABLE_NAME="$1"
MIGRATION_FILE="$2"

if [ -z "$TABLE_NAME" ] || [ -z "$MIGRATION_FILE" ]; then
    echo "Usage: $0 <table_name> <migration_file>"
    exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Extract the CREATE TABLE block for the specified table
# This handles multi-line CREATE TABLE statements

# Find the CREATE TABLE statement and extract until the closing );
sed -n "/CREATE TABLE.*${TABLE_NAME}/,/);/p" "$MIGRATION_FILE" | \
    # Remove the CREATE TABLE line
    grep -v "CREATE TABLE" | \
    # Remove the closing );
    grep -v "^);" | \
    # Remove comments
    sed 's/--.*$//' | \
    # Remove empty lines
    grep -v "^$" | \
    # Extract column definitions (lines that start with whitespace and a word)
    grep -E "^\s*[a-zA-Z_]+" | \
    # Clean up whitespace
    sed 's/^\s*//' | \
    # Remove trailing commas
    sed 's/,$//' | \
    # Extract column name and type
    sed -E 's/^([a-zA-Z_]+)\s+([A-Z]+[^ ,]*).*/\1|\2/'

