# tonal
Music library web app and REST API


Web app is located in the folder `static`. 

Run the server by running `python app.py`. 


## REST API

REST API will be running on:

```
http://localhost:5000/api/v1.0/
```


To access the API a token is required. Get a token by accessing:

```
http://localhost:5000/api/v1.0/token
```

This will return a token (that expires). Use the token in any subsequent requests by setting the token in the Authorization header: `Token <token>` .


## WEB APP

WEB APP will be running on:

```
http://localhost:5000/static/index.html
```