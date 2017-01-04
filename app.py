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
from flask_jwt import JWT, jwt_required, current_identity
from werkzeug.security import safe_str_cmp


basicAuth = HTTPBasicAuth()
tokenAuth = HTTPTokenAuth(scheme='Token')

dbConnectionString='sqlite:///music.db'
e = create_engine(dbConnectionString)

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = dbConnectionString
app.config['SECRET_KEY']='\xcafW-\xbeX\x98-\x1a\xb2g\xc1\x0e\x87\xb2\x83[\xa0\x0fi/\x18\x85\xda'

db = SQLAlchemy(app)


api = Api(app)
app._static_folder = os.path.abspath("static/")
rootpath="/api/v1.0"

@tokenAuth.verify_token
def verify_token(token):
    url=request.url
    print(url)
    if not token:
        parsed = urlparse.urlparse(url)
        token = urlparse.parse_qs(parsed.query)['token']
        if len(token)>0:
            token=token[0]
    user = User.verify_auth_token(token)
    if not user:
        return False
    print("userid: {}".format(user))
    return True
    
@basicAuth.verify_password
def verify_password(username, password):
    # first try to authenticate by token
    print("user: {},password: {}".format(username,password))
    # try to authenticate with username/password
    user = User.query.filter_by(username = username).first()
    if not user or not user.verify_password(password):
        return False  
    g.user=user  
    return True


class User(db.Model):
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
    @tokenAuth.login_required
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
    @tokenAuth.login_required 
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
    @tokenAuth.login_required
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
    @tokenAuth.login_required
    def get(self,albumartist):
        conn = e.connect()
        queryString= "select * from albums where albumartist='{}'".format(albumartist)
        query = conn.execute(queryString)
        return {'albums': [i[9] for i in query.cursor.fetchall()]}

class Album(Resource):
    @tokenAuth.login_required
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
    @tokenAuth.login_required
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
    @tokenAuth.login_required
    def post(self):
        content = request.get_json()
        if not content:
            abort(400)
        return {'id':0}

class Radiostations(Resource):
    @tokenAuth.login_required
    def get(self):
        radiostations=[{"name":"Radio Paradise","url":"http://stream-eu1.radioparadise.com/aac-320"},
                        {"name":"KEXP","url":"http://live-mp3-128.kexp.org:80/kexp128.mp3"},
                        {"name":"FIP","url":"http://direct.fipradio.fr/live/fip-midfi.mp3"}]
        return radiostations

class Token(Resource):
    @basicAuth.login_required
    def get(self):
        token = g.user.generate_auth_token()
        print("token: "+token.decode('ascii'))
        return jsonify({ 'token': token.decode('ascii') })

api.add_resource(Albumartists, rootpath+'/artists') 
api.add_resource(Albums, rootpath+'/albums')
api.add_resource(Albumartist, rootpath+'/artists/<string:albumartist>')
api.add_resource(Album, rootpath+'/artists/<string:albumartist>/<string:album>')
api.add_resource(Song, rootpath+'/artists/<string:albumartist>/<string:album>/<string:song>')
api.add_resource(Artwork, rootpath+'/artwork/artists/<string:albumartist>/<string:album>')
api.add_resource(Playlist, rootpath+'/playlists')
api.add_resource(Radiostations, rootpath+'/radiostations')
api.add_resource(Token, rootpath+'/token')

if __name__ == '__main__':
     app.run()
