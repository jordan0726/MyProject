def generate_music_id(title: str, album: str) -> str:
    # remove leading and trailing spaces, convert to lowercase, and concatenate with '|'
    return f"{title.strip().lower()}|{album.strip().lower()}"
