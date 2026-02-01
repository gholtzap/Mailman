#!/usr/bin/env python3

import os
import sys
import json
import random
import subprocess
import time
import argparse
import requests
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

# Comprehensive list of arXiv categories
ARXIV_CATEGORIES = {
    # Computer Science
    'cs.AI': 'Artificial Intelligence',
    'cs.AR': 'Hardware Architecture',
    'cs.CC': 'Computational Complexity',
    'cs.CE': 'Computational Engineering, Finance, and Science',
    'cs.CG': 'Computational Geometry',
    'cs.CL': 'Computation and Language',
    'cs.CR': 'Cryptography and Security',
    'cs.CV': 'Computer Vision and Pattern Recognition',
    'cs.CY': 'Computers and Society',
    'cs.DB': 'Databases',
    'cs.DC': 'Distributed, Parallel, and Cluster Computing',
    'cs.DL': 'Digital Libraries',
    'cs.DM': 'Discrete Mathematics',
    'cs.DS': 'Data Structures and Algorithms',
    'cs.ET': 'Emerging Technologies',
    'cs.FL': 'Formal Languages and Automata Theory',
    'cs.GL': 'General Literature',
    'cs.GR': 'Graphics',
    'cs.GT': 'Computer Science and Game Theory',
    'cs.HC': 'Human-Computer Interaction',
    'cs.IR': 'Information Retrieval',
    'cs.IT': 'Information Theory',
    'cs.LG': 'Machine Learning',
    'cs.LO': 'Logic in Computer Science',
    'cs.MA': 'Multiagent Systems',
    'cs.MM': 'Multimedia',
    'cs.MS': 'Mathematical Software',
    'cs.NA': 'Numerical Analysis',
    'cs.NE': 'Neural and Evolutionary Computing',
    'cs.NI': 'Networking and Internet Architecture',
    'cs.OH': 'Other Computer Science',
    'cs.OS': 'Operating Systems',
    'cs.PF': 'Performance',
    'cs.PL': 'Programming Languages',
    'cs.RO': 'Robotics',
    'cs.SC': 'Symbolic Computation',
    'cs.SD': 'Sound',
    'cs.SE': 'Software Engineering',
    'cs.SI': 'Social and Information Networks',
    'cs.SY': 'Systems and Control',

    # Physics
    'physics.acc-ph': 'Accelerator Physics',
    'physics.ao-ph': 'Atmospheric and Oceanic Physics',
    'physics.app-ph': 'Applied Physics',
    'physics.atm-clus': 'Atomic and Molecular Clusters',
    'physics.atom-ph': 'Atomic Physics',
    'physics.bio-ph': 'Biological Physics',
    'physics.chem-ph': 'Chemical Physics',
    'physics.class-ph': 'Classical Physics',
    'physics.comp-ph': 'Computational Physics',
    'physics.data-an': 'Data Analysis, Statistics and Probability',
    'physics.flu-dyn': 'Fluid Dynamics',
    'physics.gen-ph': 'General Physics',
    'physics.geo-ph': 'Geophysics',
    'physics.hist-ph': 'History and Philosophy of Physics',
    'physics.ins-det': 'Instrumentation and Detectors',
    'physics.med-ph': 'Medical Physics',
    'physics.optics': 'Optics',
    'physics.plasm-ph': 'Plasma Physics',
    'physics.pop-ph': 'Popular Physics',
    'physics.soc-ph': 'Physics and Society',
    'physics.space-ph': 'Space Physics',

    # Mathematics
    'math.AC': 'Commutative Algebra',
    'math.AG': 'Algebraic Geometry',
    'math.AP': 'Analysis of PDEs',
    'math.AT': 'Algebraic Topology',
    'math.CA': 'Classical Analysis and ODEs',
    'math.CO': 'Combinatorics',
    'math.CT': 'Category Theory',
    'math.CV': 'Complex Variables',
    'math.DG': 'Differential Geometry',
    'math.DS': 'Dynamical Systems',
    'math.FA': 'Functional Analysis',
    'math.GM': 'General Mathematics',
    'math.GN': 'General Topology',
    'math.GR': 'Group Theory',
    'math.GT': 'Geometric Topology',
    'math.HO': 'History and Overview',
    'math.IT': 'Information Theory',
    'math.KT': 'K-Theory and Homology',
    'math.LO': 'Logic',
    'math.MG': 'Metric Geometry',
    'math.MP': 'Mathematical Physics',
    'math.NA': 'Numerical Analysis',
    'math.NT': 'Number Theory',
    'math.OA': 'Operator Algebras',
    'math.OC': 'Optimization and Control',
    'math.PR': 'Probability',
    'math.QA': 'Quantum Algebra',
    'math.RA': 'Rings and Algebras',
    'math.RT': 'Representation Theory',
    'math.SG': 'Symplectic Geometry',
    'math.SP': 'Spectral Theory',
    'math.ST': 'Statistics Theory',

    # Quantitative Biology
    'q-bio.BM': 'Biomolecules',
    'q-bio.CB': 'Cell Behavior',
    'q-bio.GN': 'Genomics',
    'q-bio.MN': 'Molecular Networks',
    'q-bio.NC': 'Neurons and Cognition',
    'q-bio.OT': 'Other Quantitative Biology',
    'q-bio.PE': 'Populations and Evolution',
    'q-bio.QM': 'Quantitative Methods',
    'q-bio.SC': 'Subcellular Processes',
    'q-bio.TO': 'Tissues and Organs',

    # Statistics
    'stat.AP': 'Applications',
    'stat.CO': 'Computation',
    'stat.ME': 'Methodology',
    'stat.ML': 'Machine Learning',
    'stat.OT': 'Other Statistics',
    'stat.TH': 'Statistics Theory',
}

# File to track processed papers
PROCESSED_PAPERS_FILE = '.processed_papers.json'

def load_processed_papers():
    """Load the set of already processed paper IDs."""
    if os.path.exists(PROCESSED_PAPERS_FILE):
        try:
            with open(PROCESSED_PAPERS_FILE, 'r') as f:
                data = json.load(f)
                return set(data.get('processed_ids', []))
        except Exception as e:
            print(f"Warning: Could not load processed papers file: {e}")
            return set()
    return set()

def save_processed_papers(processed_ids):
    """Save the set of processed paper IDs."""
    try:
        data = {
            'processed_ids': list(processed_ids),
            'last_updated': datetime.now().isoformat()
        }
        with open(PROCESSED_PAPERS_FILE, 'w') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Warning: Could not save processed papers file: {e}")

def mark_paper_processed(paper_id, processed_ids):
    """Mark a paper as processed and save to file."""
    processed_ids.add(paper_id)
    save_processed_papers(processed_ids)

def cleanup_empty_directories(base_path='/Users/gmh/dev/playground/paper-reader/outputs'):
    """Remove all empty directories from the outputs folder."""
    if not os.path.exists(base_path):
        return

    removed_count = 0
    # Walk bottom-up so we can remove nested empty dirs
    for root, dirs, files in os.walk(base_path, topdown=False):
        for dir_name in dirs:
            dir_path = os.path.join(root, dir_name)
            try:
                # Try to remove directory - will only succeed if empty
                if not os.listdir(dir_path):  # Check if directory is empty
                    os.rmdir(dir_path)
                    removed_count += 1
                    print(f"  Removed empty directory: {dir_path}")
            except OSError:
                # Directory not empty or other error, skip
                pass

    if removed_count > 0:
        print(f"\n🧹 Cleaned up {removed_count} empty director{'y' if removed_count == 1 else 'ies'}")

    return removed_count

def query_arxiv(category, max_results=5):
    """Query arXiv API for papers in a specific category."""
    base_url = 'http://export.arxiv.org/api/query'

    query_params = {
        'search_query': f'cat:{category}',
        'start': 0,
        'max_results': max_results,
        'sortBy': 'submittedDate',
        'sortOrder': 'descending'
    }

    try:
        response = requests.get(base_url, params=query_params, timeout=30)
        response.raise_for_status()
        return parse_arxiv_response(response.text)
    except Exception as e:
        print(f"Error querying arXiv for category {category}: {e}")
        return []

def parse_arxiv_response(xml_data):
    """Parse arXiv API XML response."""
    papers = []

    try:
        root = ET.fromstring(xml_data)

        # Namespace handling for arXiv API
        ns = {
            'atom': 'http://www.w3.org/2005/Atom',
            'arxiv': 'http://arxiv.org/schemas/atom'
        }

        for entry in root.findall('atom:entry', ns):
            title_elem = entry.find('atom:title', ns)
            id_elem = entry.find('atom:id', ns)
            summary_elem = entry.find('atom:summary', ns)
            published_elem = entry.find('atom:published', ns)

            if title_elem is not None and id_elem is not None:
                arxiv_id = id_elem.text.split('/abs/')[-1]
                pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"

                paper = {
                    'title': title_elem.text.strip().replace('\n', ' '),
                    'id': arxiv_id,
                    'url': id_elem.text,
                    'pdf_url': pdf_url,
                    'summary': summary_elem.text.strip() if summary_elem is not None else '',
                    'published': published_elem.text if published_elem is not None else ''
                }
                papers.append(paper)
    except Exception as e:
        print(f"Error parsing arXiv response: {e}")

    return papers

def process_paper(paper_url, output_dir=None):
    """Call process_paper.py for a given paper URL.

    Returns:
        'success' - paper processed successfully
        'skipped' - paper skipped (e.g., too many pages)
        'failed' - processing failed with error
    """
    try:
        cmd = ['python3', 'process_paper.py', paper_url]

        # Change to output directory if specified
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
            original_dir = os.getcwd()
            os.chdir(output_dir)

        print(f"\n{'='*80}")
        print(f"Processing: {paper_url}")
        print(f"{'='*80}\n")

        result = subprocess.run(cmd, check=True, capture_output=False)

        # Change back to original directory
        if output_dir:
            os.chdir(original_dir)

        return 'success'
    except subprocess.CalledProcessError as e:
        # Exit code 2 means paper was skipped (e.g., too many pages)
        if e.returncode == 2:
            print(f"Paper skipped: {paper_url}")
            return 'skipped'
        else:
            print(f"Error processing paper {paper_url}: {e}")
            return 'failed'
    except Exception as e:
        print(f"Unexpected error: {e}")
        return 'failed'

def main():
    parser = argparse.ArgumentParser(
        description='Scrape arXiv for papers from random categories and process them.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                     # Process papers from 3 random categories (5 papers each)
  %(prog)s -n 5                # Process papers from 5 random categories
  %(prog)s -n 2 -p 10          # Process 10 papers from each of 2 random categories
  %(prog)s -c cs.AI cs.LG      # Process papers from specific categories
  %(prog)s --list-categories   # List all available categories
        """
    )

    parser.add_argument('-n', '--num-categories', type=int, default=3,
                        help='Number of random categories to select (1-10, default: 3)')
    parser.add_argument('-p', '--papers-per-category', type=int, default=5,
                        help='Number of papers to fetch per category (default: 5)')
    parser.add_argument('-c', '--categories', nargs='+',
                        help='Specific categories to use (overrides random selection)')
    parser.add_argument('--list-categories', action='store_true',
                        help='List all available arXiv categories and exit')
    parser.add_argument('-d', '--delay', type=float, default=10.0,
                        help='Delay in seconds between processing papers (default: 10.0)')
    parser.add_argument('-o', '--output-dir', type=str,
                        help='Output directory for processed papers (optional)')
    parser.add_argument('--skip-processed', action='store_true', default=True,
                        help='Skip papers that have already been processed (default: True)')
    parser.add_argument('--reprocess-all', action='store_true',
                        help='Reprocess all papers, even if already processed')
    parser.add_argument('--dry-run', action='store_true',
                        help='Fetch papers and show what would be processed without actually calling the API')

    args = parser.parse_args()

    # List categories if requested
    if args.list_categories:
        print("\nAvailable arXiv categories:\n")
        for cat, desc in sorted(ARXIV_CATEGORIES.items()):
            print(f"  {cat:<20} - {desc}")
        print(f"\nTotal: {len(ARXIV_CATEGORIES)} categories\n")
        return

    # Validate and select categories
    if args.categories:
        selected_categories = []
        for cat in args.categories:
            if cat in ARXIV_CATEGORIES:
                selected_categories.append(cat)
            else:
                print(f"Warning: Unknown category '{cat}', skipping...")

        if not selected_categories:
            print("Error: No valid categories specified.")
            sys.exit(1)
    else:
        # Random selection
        num_categories = max(1, min(10, args.num_categories))
        selected_categories = random.sample(list(ARXIV_CATEGORIES.keys()), num_categories)

    print("\n" + "="*80)
    print(f"arXiv Paper Scraper - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    print(f"\nSelected Categories ({len(selected_categories)}):")
    for cat in selected_categories:
        print(f"  • {cat} - {ARXIV_CATEGORIES[cat]}")
    print(f"\nPapers per category: {args.papers_per_category}")
    print(f"Delay between papers: {args.delay}s")
    if args.output_dir:
        print(f"Output directory: {args.output_dir}")

    # Load processed papers tracker
    skip_processed = args.skip_processed and not args.reprocess_all
    processed_ids = load_processed_papers() if skip_processed else set()

    if skip_processed:
        print(f"Skip already processed: Yes ({len(processed_ids)} papers in history)")
    else:
        print(f"Skip already processed: No (reprocessing all)")

    if args.dry_run:
        print(f"DRY RUN MODE: Will not call process_paper.py or use API credits")
    print()

    # Fetch and process papers
    all_papers = []

    # Fetch extra papers as buffer (some may be skipped due to page limits)
    # Fetch 3x the requested amount to ensure we get enough valid papers
    fetch_multiplier = 3

    for category in selected_categories:
        print(f"\nFetching papers from {category}...")
        # Fetch extra papers to account for those that will be skipped
        fetch_count = args.papers_per_category * fetch_multiplier
        papers = query_arxiv(category, max_results=fetch_count)
        print(f"Found {len(papers)} papers (fetching extra as buffer for page-limit filtering)")

        for paper in papers:
            paper['category'] = category
            all_papers.append(paper)
            print(f"  • {paper['title'][:80]}...")

        time.sleep(1)  # Be nice to arXiv API

    # Filter out already processed papers
    original_count = len(all_papers)
    if skip_processed:
        all_papers = [p for p in all_papers if p['id'] not in processed_ids]
        skipped = original_count - len(all_papers)
    else:
        skipped = 0

    print(f"\n{'='*80}")
    print(f"Total papers found: {original_count}")
    if skipped > 0:
        print(f"Already processed (skipping): {skipped}")
    print(f"Papers to process: {len(all_papers)}")
    print(f"{'='*80}\n")

    if len(all_papers) == 0:
        print("No new papers to process!")
        return

    # Process papers by category, stopping when we get enough successful ones per category
    total_processed = 0
    total_failed = 0
    total_skipped_pages = 0

    # Track successful papers per category
    category_success = {cat: 0 for cat in selected_categories}
    target_per_category = args.papers_per_category

    # Group papers by category
    from collections import defaultdict
    papers_by_category = defaultdict(list)
    for paper in all_papers:
        papers_by_category[paper['category']].append(paper)

    # Process each category
    paper_num = 0
    for category in selected_categories:
        papers = papers_by_category.get(category, [])
        print(f"\n{'='*80}")
        print(f"Processing category: {category}")
        print(f"Target: {target_per_category} successful papers")
        print(f"Available: {len(papers)} papers to try")
        print(f"{'='*80}")

        if not papers:
            print(f"No papers available for {category}")
            continue

        for paper in papers:
            # Stop if we've successfully processed enough papers from this category
            if category_success[category] >= target_per_category:
                print(f"\nReached target of {target_per_category} papers for {category}")
                break

            paper_num += 1
            print(f"\n[Paper {paper_num}] {category}")
            print(f"Title: {paper['title']}")
            print(f"Paper ID: {paper['id']}")
            print(f"PDF URL: {paper['pdf_url']}")

            if args.dry_run:
                # Dry run: just show what would be processed
                print("  [DRY RUN] Would process this paper")
                category_success[category] += 1
                total_processed += 1
            else:
                # Create category-specific output directory if needed
                if args.output_dir:
                    output_subdir = os.path.join(args.output_dir, category.replace('.', '_'))
                else:
                    output_subdir = None

                status = process_paper(paper['pdf_url'], output_dir=output_subdir)

                if status == 'success':
                    category_success[category] += 1
                    total_processed += 1
                    # Mark paper as processed
                    if skip_processed:
                        mark_paper_processed(paper['id'], processed_ids)
                        print(f"Marked as processed: {paper['id']}")
                    print(f"Category progress: {category_success[category]}/{target_per_category}")
                elif status == 'skipped':
                    total_skipped_pages += 1
                    print(f"Skipped (exceeded page limit), continuing to next paper...")
                else:  # failed
                    total_failed += 1
                    print(f"Failed, continuing to next paper...")

                # Delay between papers (except if we've hit the target for this category)
                if category_success[category] < target_per_category and papers.index(paper) < len(papers) - 1:
                    if args.dry_run:
                        print(f"\n[DRY RUN] Would wait {args.delay}s before next paper...")
                    else:
                        print(f"\nWaiting {args.delay}s before next paper...")
                        time.sleep(args.delay)

    # Summary
    print("\n" + "="*80)
    print("PROCESSING COMPLETE")
    print("="*80)
    print(f"Total papers found: {original_count}")
    if skipped > 0:
        print(f"Already processed (skipped): {skipped}")
    print(f"\nSuccessfully processed: {total_processed}")

    # Show per-category results
    if len(selected_categories) > 1:
        print("\nPer-category results:")
        for category in selected_categories:
            success = category_success[category]
            target = target_per_category
            status = "OK" if success >= target else "INCOMPLETE"
            print(f"  {status} {category}: {success}/{target} papers")

    if total_skipped_pages > 0:
        print(f"\nSkipped (too many pages): {total_skipped_pages}")
    if total_failed > 0:
        print(f"Failed (errors): {total_failed}")
    if skip_processed:
        print(f"\nTotal in history: {len(processed_ids)}")

    # Cleanup empty directories
    if not args.dry_run:
        print("\nCleaning up empty directories...")
        cleanup_empty_directories()

    print("="*80 + "\n")

if __name__ == "__main__":
    main()
