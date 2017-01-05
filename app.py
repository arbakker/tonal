from flask import Flask, request, Response, current_app, make_response, send_file, g, jsonify, abort
from flask_httpauth import HTTPBasicAuth, HTTPTokenAuth
from flask_restful import Resource, Api
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.exceptions import Unauthorized
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer, BadSignature, SignatureExpired
from sqlalchemy import create_engine,inspect
from functools import wraps
from json import dumps
from mutagen import File
from tempfile import NamedTemporaryFile
from shutil import copyfileobj
import urllib.parse as urlparse
import os
from flask_jwt import JWT, jwt_required, current_identity,JWTError
from werkzeug.security import safe_str_cmp
from datetime import datetime, timedelta
import jwt  as pyjwt

app = Flask(__name__)
dbConnectionString='sqlite:///music.db'
rootpath="/api/v1.0"
app.config['SQLALCHEMY_DATABASE_URI'] = dbConnectionString
app.config['SECRET_KEY']='\xcafW-\xbeX\x98-\x1a\xb2g\xc1\x0e\x87\xb2\x83[\xa0\x0fi/\x18\x85\xda'
app.config['JWT_AUTH_URL_RULE']=rootpath+"/token"
app.config['JWT_EXPIRATION_DELTA']=timedelta(seconds=1)

app._static_folder = os.path.abspath("static/")

def verify_password(username, password):
    # first try to authenticate by token
    print("user: {},password: {}".format(username,password))
    # try to authenticate with username/password
    user = User.query.filter_by(username = username).first()
    if not user or not user.verify_password(password):
        return False  
    g.user=user  
    return True

def authenticate(username, password):
    url=request.url
    print(url)
    print("jwt auth")
    if verify_password(username,password):
        return g.user

def identity(payload):
    user_id = payload['identity']
    user= User.query.filter_by(id = user_id).first()
    g.user=user
    return user

def parse_token(req):
    token = req.headers.get('Authorization').split()[1]
    return pyjwt.decode(token, app.config['SECRET_KEY'], algorithms='HS256')

def create_token(user):
    payload = {
        # subject
        'sub': user.id,
        #issued at
        'iat': datetime.utcnow(),
        #expiry
        'exp': datetime.utcnow() + app.config['JWT_EXPIRATION_DELTA']
    }
    token = pyjwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
    return token.decode('unicode_escape')

class ExceptionAwareApi(Api):
    def handle_error(self, e):
        if isinstance(e, JWTError):
            print("JWTError")
            code = 401
            data = {'status_code': code, 'message': "Token is expired."}
        elif isinstance(e, pyjwt.exceptions.ExpiredSignatureError):
            print("ExpiredSignatureError")
            code = 401
            data = {'status_code': code, 'message': "Token is expired."}
        else:
            # Did not match a custom exception, continue normally
            return super(ExceptionAwareApi, self).handle_error(e)
        return self.make_response(data, code)



e = create_engine(dbConnectionString)
db = SQLAlchemy(app)

api = ExceptionAwareApi(app)
jwt = JWT(app, authenticate, identity)


class User(db.Model):
    def __init__(self, id, username, password_hash):
        self.id = id
        self.username = username
        self.password_hash = password_hash

    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key = True)
    username = db.Column(db.String(32), index = True)
    password_hash = db.Column(db.String(160))

    def hash_password(self, password):
        self.password_hash = generate_password_hash(password)

    def verify_password(self, password):
        return check_password_hash(self.password_hash,password)

    def generate_auth_token(self, expiration = 600):
        s = Serializer(app.config['SECRET_KEY'], expires_in = expiration)
        return s.dumps({ 'id': self.id })

    @staticmethod
    def verify_auth_token(token):
        s = Serializer(app.config['SECRET_KEY'])
        token=token.replace("Bearer ","")
        print("token:" + token)
        try:
            data = s.loads(token)
        except SignatureExpired:
            print("SignatureExpired")
            return None # valid token, but expired
        except BadSignature:
            print("BadSignature")
            return None # invalid token
        user = User.query.get(data['id'])
        return user


class Playlist(db.Model):
    __tablename__ = 'playlists'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text)
    playlist = db.Column(db.Text)

    def __init__(self, name, playlist):
        self.name = name
        self.playlist = playlist

    def __repr__(self):
        return '<Playlist {}>'.format(self.name)

#playlist_1 = Playlist('playlist_1', 'some playlist')
#db.session.add(playlist_1)
#db.session.commit()

@app.route('/static/<path:filename>')
def serve_static(filename):
    root_dir = os.path.dirname(os.getcwd())
    return send_from_directory(os.path.join(root_dir, 'static', 'js'),   filename)

class Artwork(Resource):
    @jwt_required()
    def get(self,albumartist,album):
        conn = e.connect()
        queryString="select * from items where albumartist='{}' and album='{}' order by track ASC".format(albumartist,album)
        query = conn.execute(queryString)
        songObject =query.first()
        path=songObject[52].decode('utf-8')
        file = File(path)
        #for tag in file.tags:
        #    print(tag)
        imageData = file.tags['APIC:cover'].data
        tempFileObj = NamedTemporaryFile(mode='w+b',suffix='jpg')
        with open('myfile.jpg','wb') as img:
            img.write(imageData) # write artwork to new image
        with open('myfile.jpg','rb') as img:
            copyfileobj(img,tempFileObj)
        os.remove('myfile.jpg')
        tempFileObj.seek(0,0)
        response = send_file(tempFileObj, as_attachment=True, attachment_filename='myfile.jpg')
        return response
        

class Albums(Resource):
    @jwt_required()
    def get(self):
        sort = request.args.get("sort")
        #Connect to databse
        conn = e.connect()
        #Perform query and return JSON data
        if sort=="latest":
            query = conn.execute("select * from albums order by added DESC")
        else:
            query = conn.execute("select * from albums order by album ASC")
        return {'albums': [{'album':i[9],'albumartist':i[4]} for i in query.cursor.fetchall()]}

class Albumartists(Resource):
    @jwt_required()
    def get(self):
        conn = e.connect()
        query = conn.execute("select distinct albumartist from albums")
        #where Department='%s'"%department_name.upper())
        #Query the result and get cursor.Dumping that data to a JSON is looked by extension
        #result = {'data': [dict(zip(tuple (query.keys()) ,i)) for i in query.cursor]}
        result = {'albumartists': [i[0] for i in query.cursor.fetchall()]}
        return result
        #We can have PUT,DELETE,POST here. But in our API GET implementation is sufficient

class Albumartist(Resource):
    @jwt_required()
    def get(self,albumartist):
        conn = e.connect()
        queryString= "select * from albums where albumartist='{}'".format(albumartist)
        query = conn.execute(queryString)
        return {'albums': [i[9] for i in query.cursor.fetchall()]}

class Album(Resource):
    @jwt_required()
    def get(self, albumartist,album):
        conn = e.connect()
        queryString= "select * from albums where albumartist='{}' and album='{}'".format(albumartist,album)
        queryStringSongs="select * from items where albumartist='{}' and album='{}' order by track ASC".format(albumartist,album)
        query = conn.execute(queryString)
        querySongs = conn.execute(queryStringSongs)
        albumObject =query.first()
        app_url=request.url_root+rootpath[1:]
        tracks = [{'id':i[36],'title':i[9], 'track':i[48], 'artist':i[22],'albumartist':i[32],'album':i[37], 'url': app_url+"/artists/{}/{}/{}".format(i[32],i[37],i[9]) } for i in querySongs.cursor.fetchall()]
        return {'album': {'title': albumObject[9],'albumartist':albumObject[4],'year':albumObject[5], 'tracks':tracks}}
        #return {'album': ['title':i[9],'albumartist':i[4],'year':i[5] for i in query.cursor.fetchall()]}

class Song(Resource):
    @jwt_required()
    def get(self,albumartist,album,song):
        conn = e.connect()
        queryString="select * from items where albumartist='{}' and album='{}' and title='{}'".format(albumartist,album,song)
        query = conn.execute(queryString)
        songObject =query.first()
        if isinstance(songObject[52], str):
            path=songObject[52]
        else:
            path=songObject[52].decode('utf-8')
        response = make_response(send_file(path))
        response.headers['Content-Type'] = 'audio/mpeg'
        return response
 
class Playlist(Resource):
    @jwt_required()
    def post(self):
        content = request.get_json()
        if not content:
            abort(400)
        return {'id':0}

class Radiostations(Resource):
    @jwt_required()
    def get(self):
        radiostations=[{"name":"Radio Paradise","url":"http://stream-eu1.radioparadise.com/aac-320"},
                        {"name":"KEXP","url":"http://live-mp3-128.kexp.org:80/kexp128.mp3"},
                        {"name":"FIP","url":"http://direct.fipradio.fr/live/fip-midfi.mp3"}]
        return radiostations





#class RefreshToken(Resource):
#    @jwt_required()
#    def get(self):
#        token = request.headers.get('Authorization').split()[1]
#        newToken=create_token(g.user)
#       return {'access_token':newToken }



api.add_resource(Albumartists, rootpath+'/artists') 
api.add_resource(Albums, rootpath+'/albums')
api.add_resource(Albumartist, rootpath+'/artists/<string:albumartist>')
api.add_resource(Album, rootpath+'/artists/<string:albumartist>/<string:album>')
api.add_resource(Song, rootpath+'/artists/<string:albumartist>/<string:album>/<string:song>')
api.add_resource(Artwork, rootpath+'/artwork/artists/<string:albumartist>/<string:album>')
api.add_resource(Playlist, rootpath+'/playlists')
api.add_resource(Radiostations, rootpath+'/radiostations')
#api.add_resource(RefreshToken, rootpath+'/tokenrefresh')

if __name__ == '__main__':
     app.run()
