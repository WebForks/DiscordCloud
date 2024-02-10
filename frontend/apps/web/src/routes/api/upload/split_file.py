import json


def split_file(filename, part_size=25165824):
    """Split a file into multiple parts of specified size."""
    part_num = 1
    file_split_names = []
    with open(filename, 'rb') as f:
        while True:
            chunk = f.read(part_size)
            if not chunk:
                break  # End of file
            part_filename = f"{filename}-{part_num}.txt"
            file_split_names.append(part_filename)
            with open(part_filename, 'wb') as part_file:
                part_file.write(chunk)
            part_num += 1
    # Print the file names as a JSON array so that it can be easily parsed by Node.js
    print(json.dumps(file_split_names))


if __name__ == "__main__":
    import sys
    filename = sys.argv[1]
    part_size = int(sys.argv[2])
    split_file(filename, part_size)
