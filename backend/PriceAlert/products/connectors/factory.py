from .amazon import AmazonConnector

def get_connector(ec_site_code):
    """URLに基づいて適切なコネクタを返す"""
    if ec_site_code == "amazon":
        return AmazonConnector()
    # TODO: 他のECサイトを追加する
    raise ValueError(f"サポートされていないサイトです: {ec_site_code}")

def identify_ec_site_from_url(url):
    """URLからECサイトを特定する"""
    if "amazon" in url:
        return "amazon"
    # TODO: 他のECサイトを追加する
    return None