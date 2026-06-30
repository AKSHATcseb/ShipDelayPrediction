"""
logger.py

Structured logging configuration for the Ship Delay Prediction pipeline.
Provides formatted logging output to stdout and log files.
"""

import logging
import sys
from pathlib import Path

def setup_logger(name: str = "ShipDelayPrediction", log_file: str = "pipeline.log") -> logging.Logger:
    """Sets up a logger that outputs to console and a log file."""
    logger = logging.getLogger(name)
    
    # Avoid duplicate handlers if logger is already initialized
    if logger.handlers:
        return logger
        
    logger.setLevel(logging.INFO)
    
    # Create formatters
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s [%(name)s.%(funcName)s:%(lineno)d] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)
    logger.addHandler(console_handler)
    
    # File Handler
    log_dir = Path(__file__).resolve().parent / "logs"
    log_dir.mkdir(exist_ok=True)
    file_handler = logging.FileHandler(log_dir / log_file, encoding='utf-8')
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)
    logger.addHandler(file_handler)
    
    return logger

# Create global default logger
logger = setup_logger()
