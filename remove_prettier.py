import json
import sys

try:
    data = json.load(sys.stdin)
except json.JSONDecodeError as e:
    print(f"Error decoding JSON: {e}", file=sys.stderr)
    sys.exit(1)

if 'devDependencies' in data and 'prettier' in data['devDependencies']:
    del data['devDependencies']['prettier']
    print("Removed prettier from devDependencies.", file=sys.stderr) # Print to stderr
else:
    print("prettier not found in devDependencies or devDependencies section missing.", file=sys.stderr) # Print to stderr

json.dump(data, sys.stdout, indent=2) # JSON output to stdout
