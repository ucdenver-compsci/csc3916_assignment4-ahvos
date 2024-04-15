/*
CSC3916 HW4
File: Server.js
Description: Web API scaffolding for Movie API
 */

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var mongoose = require('mongoose');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json ({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});


router.post('/movies', function(req, res) {
    // Check if all required fields are provided
    if (!req.body.title || !req.body.releaseDate || !req.body.genre || !req.body.actors || !req.body.imageURL) {
        return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    Movie.findOne({ title: req.body.title }, function(err, existingMovie) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to check for duplicate movie.', error: err });
        }

        if (existingMovie) {
            return res.status(409).json({ success: false, message: 'A movie with the same title already exists.' });
        }

        var newMovie = new Movie({
            title: req.body.title,
            releaseDate: req.body.releaseDate,
            genre: req.body.genre,
            actors: req.body.actors,
            imageURL: req.body.imageURL
        });

        newMovie.save(function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Failed to add the movie.', error: err });
            }
            res.status(201).json({ success: true, message: 'Movie added successfully.' });
        });
    });
});

router.get('/movies', function(req, res) {
    Movie.find({}, function(err, movies) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to retrieve movies.', error: err });
        }
        res.status(200).json({ success: true, movies: movies });
    });
});








router.delete('/movies/:id', function(req, res) {
    Movie.findByIdAndRemove(req.params.id, function(err, movie) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to delete the movie.', error: err });
        }
        if (!movie) {
            return res.status(404).json({ success: false, message: 'Movie not found.' });
        }
        res.status(200).json({ success: true, message: 'Movie deleted successfully.' });
    });
});



router.post('/reviews', function(req, res) {
    if (!req.body.movieId || !req.body.username || !req.body.review || !req.body.rating) {
        return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const { movieId, username, review, rating } = req.body;

    var newReview = new Review({
        movieId,
        username,
        review,
        rating
    });

    newReview.save(function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to add the review.', error: err });
        }
        res.status(201).json({ success: true, message: 'Review added successfully.' });
    });
});



router.get('/reviews/:movieId', authJwtController.isAuthenticated, function(req, res) {
    Review.find({ movieId: req.params.movieId }, function(err, reviews) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to retrieve reviews.', error: err });
        }
        res.status(200).json({ success: true, reviews: reviews });
    });
});


app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


