import sys
import json


def combine_files(part_filenames, output_filename):
    """Combine multiple file parts into a single file."""
    with open(output_filename, 'wb') as output_file:
        for part_filename in part_filenames:
            with open(part_filename, 'rb') as part_file:
                output_file.write(part_file.read())
    print(f"Parts have been combined into {output_filename}.")


if __name__ == "__main__":
    # Expecting a JSON string of filenames as the first argument
    part_filenames = json.loads(sys.argv[1])
    output_filename = sys.argv[2]
    combine_files(part_filenames, output_filename)
