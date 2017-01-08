from flask import Flask, request, Response, current_app, make_response, send_file, g, jsonify, abort, redirect,render_template,url_for
from flask_httpauth import HTTPBasicAuth, HTTPTokenAuth
from flask_restful import Resource, Api,reqparse
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
import flask_jwt
from flask_jwt import JWT, jwt_required, current_identity,JWTError
from werkzeug.security import safe_str_cmp
from datetime import datetime, timedelta
import jwt  as pyjwt
import time
from pagination import Pagination

app = Flask(__name__)
dbConnectionString='sqlite:///musiclibrary.db'
rootpath="/api/v1.0"
app.config['SQLALCHEMY_DATABASE_URI'] = dbConnectionString
app.config['SECRET_KEY']='\xcafW-\xbeX\x98-\x1a\xb2g\xc1\x0e\x87\xb2\x83[\xa0\x0fi/\x18\x85\xda'
app.config['JWT_AUTH_URL_RULE']=rootpath+"/token"
app.config['JWT_EXPIRATION_DELTA']=timedelta(seconds=3600)

app.config['PER_PAGE'] = 30

app._static_folder = os.path.abspath("static/")

def request_handler():
    auth_header_value = request.headers.get('Authorization', None)
    auth_header_prefix = current_app.config['JWT_AUTH_HEADER_PREFIX']
    # extract token from url
    token_parameter = request.args.get('token')
    if token_parameter:
        return token_parameter
    # url does not contain a parameter token
    if not auth_header_value:
        return
    parts = auth_header_value.split()
    if parts[0].lower() != auth_header_prefix.lower():
        raise JWTError('Invalid JWT header', 'Unsupported authorization type')
    elif len(parts) == 1:
        raise JWTError('Invalid JWT header', 'Token missing')
    elif len(parts) > 2:
        raise JWTError('Invalid JWT header', 'Token contains spaces')
    return parts[1]

flask_jwt._default_request_handler = request_handler

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
    else:
        abort(401)

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
            print(e.message)
            code = 401
            data = {'status_code': code, 'description': "JWT token is expired", 'error': 'Invalid token'}
        elif isinstance(e, pyjwt.exceptions.ExpiredSignatureError):
            print("ExpiredSignatureError")
            print(e.message)
            code = 401
            data = {'status_code': code, 'description': "Signature has expired", 'error': 'Invalid token'}
        else:
            return super(ExceptionAwareApi, self).handle_error(e)            
        return self.make_response(data, code)


e = create_engine(dbConnectionString)
db = SQLAlchemy(app)



api =  ExceptionAwareApi(app)
jwt = JWT(app, authenticate, identity)


class User(db.Model):
    def __init__(self, id, username, password_hash):
        self.id = id
        self.username = username
        self.generate_password_hash = password_hash

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
        try:
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
            response = send_file(tempFileObj, as_attachment=True, attachment_filename='myfile.jpg',mimetype='image/jpg')
        except:
            response= send_file('album_placeholder.jpg', mimetype='image/jpg')

        return response
            

class Albums(Resource):
    @jwt_required()
    def get(self):
        parser = reqparse.RequestParser()
        parser.add_argument('sort')
        args = parser.parse_args()

        sort = args['sort']
        #Connect to databse
        conn = e.connect()
        #Perform query and return JSON data
        if sort=="latest":
            query = conn.execute("select * from albums order by added DESC")
        else:
            query = conn.execute("select * from albums order by album ASC")
        return {'albums': [{'album':i[9],'albumartist':i[4]} for i in query.cursor.fetchall()]}


def url_for_other_page(page):
    args = request.view_args.copy()
    print('url_for_other_page page: ' + str(page))
    args['page'] = page
    print(request.endpoint)
    return url_for(request.endpoint, **args)

app.jinja_env.globals.update(url_for_other_page=url_for_other_page)

class Albumartists(Resource):
    @jwt_required()
    def get(self):
            parser = reqparse.RequestParser()
            parser.add_argument('page',type=int)
            args = parser.parse_args()
            page = args['page']

            if page is None:
                page=1
            elif page<1:
                abort(404)
            
            count = self.count_all_artists()

            pagination = Pagination(page, app.config['PER_PAGE'], count)
            page_count=pagination.pages

            if page>page_count:
                abort(404)

            artists = self.get_artist_for_page(page, app.config['PER_PAGE'], count)
            for artist in artists:
                print(artist)
            if not artists and page != 1:
                abort(404)
            
            data = {}
            data['albumartists'] = artists
            data['_metadata'] = {}
            data['_metadata']['page']=pagination.page
            data['_metadata']['per_page']=pagination.per_page
            data['_metadata']['page_count']=page_count
            data['_metadata']['total_count']=pagination.total_count
            data['_metadata']['pages']=[]

            for page in pagination.iter_pages():
                if page:
                    if page!=pagination.page:
                         data['_metadata']['pages'].append({'page':page,'url':url_for_other_page(page)})
            
            return jsonify(data)
       
            abort(500)

    def count_all_artists(self):
        conn = e.connect()
        sql= 'select count(distinct albumartist) from albums'
        query = conn.execute(sql)
        result=query.first()
        # result is tuple with first item containing the count
        return result[0]

    def get_artist_for_page(self,page, limit, count):
        conn = e.connect()

        offset=limit*(page-1)
        if count>offset:
            sql = "select distinct albumartist as artist from albums limit :limit offset :offset"
            query = conn.execute(sql, limit = limit, offset=offset)
            result=query.cursor.fetchall()
             # result is tuple with first item containing artist
            result=[ "%s" % x for x in result ]
        else:
            result=[]

        return result

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
        
        sqlAlbum =  "select * from albums where albumartist=:albumartist and album=:album"
        query = conn.execute(sqlAlbum,albumartist = albumartist, album=album)

        sqlSongs = "select * from items where albumartist=:albumartist and album=:album order by track ASC"
        querySongs = conn.execute(sqlSongs, albumartist = albumartist, album=album)

        albumObject =query.first()
        app_url=request.url_root+rootpath[1:]
        tracks = [{'id':i[36],'title':i[9], 'track':i[48], 'artist':i[22],'albumartist':i[32],'album':i[37], 'url': app_url+"/artists/{}/{}/{}".format(i[32],i[37],i[9]) } for i in querySongs.cursor.fetchall()]
        return {'album': {'title': albumObject[9],'albumartist':albumObject[4],'year':albumObject[5], 'tracks':tracks}}
        #return {'album': ['title':i[9],'albumartist':i[4],'year':i[5] for i in query.cursor.fetchall()]}

class Song(Resource):
    @jwt_required()
    def get(self,albumartist,album,song):
        try:
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
        except FileNotFoundError:
            abort(404)
        except:
            abort(400)

 
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


class ValidateToken(Resource):
    @jwt_required()
    def get(self):
       return {'token_valid':'true' }


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
api.add_resource(ValidateToken, rootpath+'/tokenvalidate')
#api.add_resource(RefreshToken, rootpath+'/tokenrefresh')

if __name__ == '__main__':
     app.run()
