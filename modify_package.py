import json
import sys

# Load the JSON data
try:
    data = json.load(sys.stdin)
except json.JSONDecodeError as e:
    print(f"Error decoding JSON: {e}", file=sys.stderr)
    sys.exit(1)

# Ensure 'scripts' key exists
if 'scripts' not in data:
    data['scripts'] = {}

# Modify scripts
data['scripts']['build'] = 'bun build.ts'
if 'lint:format' in data['scripts']:
    del data['scripts']['lint:format']
data['scripts']['lint'] = 'bun biome lint .'
data['scripts']['lint:fix'] = 'bun biome lint --apply .'
data['scripts']['format'] = 'bun biome format .'
data['scripts']['format:fix'] = 'bun biome format --write .'

# Print the modified JSON to stdout
json.dump(data, sys.stdout, indent=2)
