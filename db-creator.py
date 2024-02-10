import sqlite3
import os

db_path = r"file.db"
'''
# CREATES NEW DB
# Define the connection and cursor
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# SQL statement for creating a new SQLite database table
create_table_query = '''
# CREATE TABLE IF NOT EXISTS files (
#    FileName TEXT,
#    TimeUploaded TEXT,
#    FileSize INTEGER,
#    DiscordLink TEXT, -- Storing as TEXT because SQLite does not support array type natively
#    FileSplitAmount INTEGER,
#    FileSplitNames TEXT -- Storing as TEXT because SQLite does not support array type natively
# )
'''

# Execute the query
cursor.execute(create_table_query)

# Commit the changes and close the connection
conn.commit()
conn.close()

print("Database and table created successfully.")
'''
# DELETS ALL ROWS IN DB

# Ensure the directory exists
os.makedirs(os.path.dirname(db_path), exist_ok=True)

# Connect to the SQLite database (this will create the database if it doesn't exist)
conn = sqlite3.connect(db_path)

# Create a cursor object
cursor = conn.cursor()

# SQL statement to create a table
create_table_sql = 'DELETE FROM files;'

# Execute the SQL statement to create the table
cursor.execute(create_table_sql)

# Commit the changes and close the connection
conn.commit()
conn.close()
