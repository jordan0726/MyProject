from website import create_app
from website.views import SearchForm

app = create_app()
@app.context_processor
def base():
    form = SearchForm()
    return dict(form = form)
if __name__ == "__main__":
    app.run(debug=True,ssl_context=('cert.pem','key.pem'))