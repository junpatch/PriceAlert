from colorlog import ColoredFormatter
from typing import Dict, Any, Optional

class CustomColoredFormatter(ColoredFormatter):
    def __init__(self) -> None:
        log_colors: Dict[str, str] = {
            'DEBUG': 'cyan',
            'INFO': 'green',
            'WARNING': 'yellow',
            'ERROR': 'red',
            'CRITICAL': 'bold_red',
        }
        
        super().__init__(
            fmt='%(log_color)s[%(asctime)s] [%(levelname)s] %(message)s',
            datefmt='%H:%M:%S',
            log_colors=log_colors
        )
