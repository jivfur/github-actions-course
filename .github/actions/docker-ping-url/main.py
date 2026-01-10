import os
import requests
from time import sleep

def ping_url(website_url, delay, max_trials):
    trials = 0
    while trials< max_trials:
        try:
            resp = requests.get(website_url)
            if resp.status_code==200:
                print(f"Website {website_url} is reachable")
                return True
        except requests.ConnectionError:
            print(f"Website {website_url} is unreachable. Retrying in {delay} seconds")
            sleep(delay)
            trials+=1
        except requests.exceptions.MissingSchema:
            print(f"Invalid URL format {website_url}")
            return False
    return False


def run():
    website_url = os.getenv("INPUT_URL")
    delay = int(os.getenv("INPUT_DELAY"))
    max_trials = int(os.getenv("INPUT_MAX_TRIALS"))
    website_reachable = ping_url(website_url,delay, max_trials)
    if not website_reachable:
        raise Exception(f"Website {website_url} is malformed or unreachable")
    print("Website {website_url} is reachable")

if __name__=="__main__":
    run()
