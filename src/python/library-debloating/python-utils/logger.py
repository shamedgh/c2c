import threading


class thread(threading.Thread):
    def __init__(self, threadName, threadId, filePath, logger):
        threading.Thread.__init__(self)
        self.threadName = threadName
        self.threadId = threadId
        self.filePath = filePath
        self.logger = logger

    def run(self):
        logs = set()
        try:
            inputFile = open(self.filePath, 'r')
            inputFile.seek(0, 2)
            while ( self.isAlive and ):
                logs.add(inputFile.readline())
