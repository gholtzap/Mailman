#!/usr/bin/env python3

import os
import json
import re
import argparse
from pathlib import Path
from datetime import datetime

OUTPUTS_DIR = Path("outputs")
PROCESSED_FILE = ".processed_papers.json"

def extract_paper_ids_from_outputs():
    """Scan outputs directory and extract all paper IDs from directory names."""
    paper_ids = set()

    if not OUTPUTS_DIR.exists():
        print(f"Outputs directory not found: {OUTPUTS_DIR}")
        return paper_ids

    # Pattern to match arXiv paper IDs in directory names
    # Examples: arxiv-2601.22159_timestamp, arxiv-2601.22159v1_timestamp
    arxiv_pattern = re.compile(r'arxiv-(\d+\.\d+(?:v\d+)?)')

    # Walk through all directories
    for root, dirs, files in os.walk(OUTPUTS_DIR):
        for dir_name in dirs:
            match = arxiv_pattern.search(dir_name)
            if match:
                paper_id = match.group(1)
                # Only count directories that have files in them
                dir_path = os.path.join(root, dir_name)
                if any(os.scandir(dir_path)):  # Has files
                    paper_ids.add(paper_id)

    return paper_ids

def load_processed_papers():
    """Load current processed papers from JSON file."""
    if not os.path.exists(PROCESSED_FILE):
        return set(), None

    try:
        with open(PROCESSED_FILE, 'r') as f:
            data = json.load(f)
            return set(data.get('processed_ids', [])), data.get('last_updated')
    except Exception as e:
        print(f"Error loading {PROCESSED_FILE}: {e}")
        return set(), None

def save_processed_papers(paper_ids):
    """Save processed papers to JSON file."""
    data = {
        'processed_ids': sorted(list(paper_ids)),
        'last_updated': datetime.now().isoformat(),
        'synced_with_outputs': True
    }

    with open(PROCESSED_FILE, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"\nSaved {len(paper_ids)} paper IDs to {PROCESSED_FILE}")

def sync_processed_papers(mode='sync'):
    """
    Sync .processed_papers.json with outputs directory.

    Modes:
    - 'sync': Make JSON match outputs (add missing, keep all)
    - 'strict': Make JSON exactly match outputs (add missing, remove extras)
    - 'add-only': Only add papers from outputs, don't remove anything
    """
    print("="*80)
    print("SYNCING PROCESSED PAPERS TRACKING")
    print("="*80)
    print(f"Mode: {mode}\n")

    # Get paper IDs from outputs directory
    print("Scanning outputs directory...")
    outputs_ids = extract_paper_ids_from_outputs()
    print(f"Found {len(outputs_ids)} papers in outputs/")

    # Load current processed papers
    print(f"\nLoading {PROCESSED_FILE}...")
    tracked_ids, last_updated = load_processed_papers()
    print(f"Currently tracking {len(tracked_ids)} papers")
    if last_updated:
        print(f"Last updated: {last_updated}")

    # Calculate differences
    print("\nAnalyzing differences...")
    missing_from_tracking = outputs_ids - tracked_ids  # In outputs but not tracked
    extra_in_tracking = tracked_ids - outputs_ids      # Tracked but not in outputs

    # Show differences
    if missing_from_tracking:
        print(f"\nPapers in outputs/ but NOT tracked ({len(missing_from_tracking)}):")
        for paper_id in sorted(missing_from_tracking):
            print(f"  + {paper_id}")

    if extra_in_tracking:
        print(f"\nPapers tracked but NOT in outputs/ ({len(extra_in_tracking)}):")
        for paper_id in sorted(extra_in_tracking):
            print(f"  - {paper_id}")

    if not missing_from_tracking and not extra_in_tracking:
        print("\nAlready in sync! No changes needed.")
        return

    # Apply changes based on mode
    new_tracked_ids = tracked_ids.copy()

    if mode == 'sync' or mode == 'add-only':
        # Add missing papers
        new_tracked_ids.update(missing_from_tracking)
        if mode == 'sync':
            print(f"\nMode 'sync': Adding {len(missing_from_tracking)} papers, keeping extras")
        else:
            print(f"\nMode 'add-only': Adding {len(missing_from_tracking)} papers only")

    elif mode == 'strict':
        # Make tracking exactly match outputs
        new_tracked_ids = outputs_ids.copy()
        print(f"\nMode 'strict': Making tracking exactly match outputs")
        print(f"  Adding: {len(missing_from_tracking)}")
        print(f"  Removing: {len(extra_in_tracking)}")

    # Save changes
    save_processed_papers(new_tracked_ids)

    print("\n" + "="*80)
    print("SYNC COMPLETE")
    print("="*80)
    print(f"Previous count: {len(tracked_ids)}")
    print(f"New count: {len(new_tracked_ids)}")
    print(f"Net change: {len(new_tracked_ids) - len(tracked_ids):+d}")
    print("="*80 + "\n")

def main():
    parser = argparse.ArgumentParser(
        description='Sync .processed_papers.json with outputs/ directory',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Sync Modes:
  sync      - Add papers from outputs/, keep extras in tracking (default)
  strict    - Make tracking exactly match outputs/ (add and remove)
  add-only  - Only add papers from outputs/, never remove

Examples:
  %(prog)s                    # Default: add papers from outputs/
  %(prog)s --mode strict      # Make tracking exactly match outputs/
  %(prog)s --dry-run          # Show what would change without saving
        """
    )

    parser.add_argument('--mode', choices=['sync', 'strict', 'add-only'],
                        default='sync',
                        help='Sync mode (default: sync)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show changes without saving')

    args = parser.parse_args()

    if args.dry_run:
        print("DRY RUN MODE - No changes will be saved\n")
        # TODO: Implement dry-run logic
        print("Dry-run mode not fully implemented yet. Run without --dry-run to apply changes.")
        return

    sync_processed_papers(mode=args.mode)

if __name__ == "__main__":
    main()
