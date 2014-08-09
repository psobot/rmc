define(
['rmc_backbone', 'ext/jquery', 'ext/underscore', 'ratings', 'util'],
function(RmcBackbone, $, _, ratings, util) {

  // TODO(david): Remove "Model" suffixes from other Backbone models
  var Review = RmcBackbone.Model.extend({
    defaults: {
      comment: '',
      comment_date: new Date(0),
      anonymous: false,  // TODO(david): Get rid of this, replace with privacy
      author: null,
      author_pic_url: '',
      ratings: null
    },

    initialize: function(attrs) {
      if (attrs && attrs.comment_date) {
        this.set('comment_date', util.toDate(attrs.comment_date));
      }

      if (attrs) {
        if (attrs.id) {
          this.set('id', attrs.id);
        } else {
          this.set('id', null);
        }
        if (attrs.num_found_useful) {
          this.set('num_found_useful', attrs.num_found_useful)
        }
        if (attrs.num_rated_useful_total) {
          this.set('num_rated_useful_total', attrs.num_rated_useful_total);
        }
      }

      if (attrs && attrs.author && attrs.author.profile_pic_url) {
        this.set('author_pic_url', attrs.author.profile_pic_url);
      } else if (attrs && attrs.author && attrs.author.program_name) {
        // TODO(mack): remove require()
        // TODO(mack): maybe should set short_program_name on server
        var _user = require('user');
        attrs.author.short_program_name = _user.getShortProgramName(
          attrs.author.program_name);
        this.setProgramAvatar();
      } else {
        this.set('anonymous', true);
        this.setAnonAvatar();
      }

      if (attrs.ratings) {
        this.set('ratings', new ratings.RatingCollection(attrs.ratings));
      } else {
        this.set('ratings', new ratings.RatingCollection([{
          name: 'usefulness',
          rating: 1
        }]));
      }
    },

    setAnonAvatar: function() {
      var kittenNum = (util.getHashCode(this.get('comment')) %
                       pageData.NUM_KITTENS);
      this.set('author_pic_url',
          '/static/img/kittens/grey/' + kittenNum + '.jpg');
    },

    setProgramAvatar: function() {
      var programName = (this.get('author') || {}).program_name;
      var kittenNum = (util.getHashCode('' + programName) %
                       pageData.NUM_KITTENS);
      this.set('author_pic_url',
          '/static/img/kittens/grey/' + kittenNum + '.jpg');
    }
  });

  var CommentView = RmcBackbone.View.extend({
    className: 'comment',

    initialize: function() {
      this.template = _.template($('#comment-tpl').html());
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    }
  });

  var ReviewView = RmcBackbone.View.extend({
    className: 'review-post',

    initialize: function(options) {
      this.commentView = new CommentView({ model: this.model });
      this.ratingsView = new ratings.RatingChoiceCollectionView({
        collection: this.model.get('ratings'),
        readOnly: true
      });
      this.template = _.template($('#review-tpl').html());
    },

    events: {
      'click .review-btn': 'reviewButtonClicked'
    },

    reviewButtonClicked: function(e) {
      if (e.target.textContent === 'Yes') {
        this.model.set('num_found_useful',
            parseInt(this.model.get('num_found_useful')) + 1);
      }
      this.model.set('num_rated_useful_total',
          parseInt(this.model.get('num_rated_useful_total')) + 1);

      $.ajax('/api/v1/user/rate_review_for_user/', {
        type: 'PUT',
        data: {
          'review_id': this.model.get('id'),
          'found_helpful': e.target.textContent === 'Yes'
        }
      });

      this.model.set('id', null);
      this.render();
    },

    render: function() {
      this.$el.html(this.template({}));
      this.$('.comment-placeholder').replaceWith(this.commentView.render().el);
      this.$('.ratings-placeholder').replaceWith(this.ratingsView.render().el);
      return this;
    }
  });

  var ReviewCollection = RmcBackbone.Collection.extend({
    model: Review,

    comparator: function(model) {
      return -model.get('comment_date');
    }
  });

  // Cannot use RmcBackbone.CollectionView since we need to delay loading
  // of rest of collection
  var ReviewCollectionView = RmcBackbone.View.extend({
    className: 'review-collection',
    tagName: 'article',

    createItemView: function(model) {
      return new ReviewView({ model: model });
    },

    addItemView: function(view) {
      view.tagName = 'section';
      // TODO(david): Append all at once for faster DOM rendering
      this.$el.append(view.render().el);
    },

    // TODO(mack): refactor this mess
    render: function(firstOnly) {
      if (!this.collection.length) {
        return this;
      }

      if (firstOnly === true) {
        var firstModel = this.collection.first();
        var view = this.createItemView(firstModel);
        this.addItemView(view);
      } else if (firstOnly === false) {
        var restModels = this.collection.rest();
        _.each(restModels, function(model) {
          var view = this.createItemView(model);
          this.addItemView(view);
        }, this);
      } else {
        throw 'ReviewCollectionView.render() must be called with arg firstOnly';
      }

      return this;
    }
  });

  return {
    Review: Review,
    ReviewView: ReviewView,
    ReviewCollection: ReviewCollection,
    ReviewCollectionView: ReviewCollectionView
  };
});
