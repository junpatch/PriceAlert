from colorlog import ColoredFormatter

class CustomColoredFormatter(ColoredFormatter):
    def __init__(self):
        super().__init__(
            fmt='%(log_color)s[%(asctime)s] [%(levelname)s] %(message)s',
            datefmt='%H:%M:%S',
            log_colors={
                'DEBUG': 'cyan',
                'INFO': 'green',
                'WARNING': 'yellow',
                'ERROR': 'red',
                'CRITICAL': 'bold_red',
            }
        )
