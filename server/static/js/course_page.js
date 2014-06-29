/** @jsx React.DOM */
require(
['ext/jquery','course', 'took_this', 'user', 'tips', 'prof', 'exam', 'ratings',
  'user_course', 'review', 'sign_in', 'ext/react', 'util', 'moment'],
function($, course, tookThis, user, tips, prof, _exam, ratings, user_course,
    _review, _sign_in, React, util, moment) {

  course.CourseCollection.addToCache(pageData.courseObj);
  user_course.UserCourses.addToCache(pageData.userCourseObjs);
  prof.ProfCollection.addToCache(pageData.professorObjs);

  var courseObj = pageData.courseObj;
  var courseModel = course.CourseCollection.getFromCache(courseObj.id);
  var userCourse = courseModel.get('user_course');

  var overallRating = courseModel.getOverallRating();
  var ratingBoxView = new ratings.RatingBoxView({ model: overallRating });
  $('#rating-box-container').html(ratingBoxView.render().el);

  var courseInnerView = new course.CourseInnerView({
    courseModel: courseModel,
    userCourse: userCourse,
    shouldLinkifySectionProfs: true
  });
  $('#course-inner-container').html(courseInnerView.render().el);
  courseInnerView.animateBars();

  if (window.pageData.examObjs.length) {
    var examCollection = new _exam.ExamCollection(window.pageData.examObjs);

    // Only show this "final exams" section if there are actually exams taking
    // place in the future
    if (examCollection.latestExam().get('end_date') >= new Date()) {
      var examSchedule = new _exam.ExamSchedule({
        exams: examCollection,
        last_updated_date: window.pageData.examUpdatedDate
      });
      var courseExamScheduleView = new _exam.CourseExamScheduleView({
        examSchedule: examSchedule
      });

      $('#exam-info-container')
        .html(courseExamScheduleView.render().el)
        .show();
    }
  }

  var tookThisSidebarView = new tookThis.TookThisSidebarView({
    userCourses: courseModel.get('friend_user_courses'),
    courseCode: courseModel.get('code'),
    currentTermId: window.pageData.currentTermId
  });
  $('#took-this-sidebar-container').html(tookThisSidebarView.render().el);

  var CommentData = React.createClass({displayName: 'CommentData',
    render: function() {
      var author;
      if (this.props.anon) {
        author = (
          React.DOM.div(null
          )
        );
      } else if (this.props.author.id) {
        author = (
          React.DOM.div(null, 
            React.DOM.a({href: "/profile/{this.props.author.id.$oid"}, 
              this.props.author.name
            ), 
            React.DOM.span({className: "muted"}, " on ")
          )
        );
      } else {
        var _user = require('user');
        var program = _user.getShortProgramName(
            this.props.author.program_name);
        author = (
          React.DOM.div(null, 
          React.DOM.span({className: "muted"}, 
            "A ", ('aeiou'.indexOf(program[0].toLowerCase()) !== -1) ? 'n' : ''
          ), 
          program, 
          React.DOM.span({className: "muted"}, " student on")
          )
        );
      }
      var date = moment(this.props.date).format('MMM D, YYYY');
      return (
        React.DOM.div(null, 
          React.DOM.small({className: "comment-date"}, 
            author, 
            React.DOM.span({className: "muted"}, 
              date
            )
          )
        )
      );
    }
  });

  var Comment = React.createClass({displayName: 'Comment',
    getAnonAvatar: function() {
      var kittenNum = util.getHashCode(this.props.data.comment) %
          pageData.NUM_KITTENS;
      return '/static/img/kittens/grey/' + kittenNum + '.jpg';
    },

    getProgramAvatar: function() {
      var programName = (this.props.data.author || {}).program_name;
      var kittenNum = util.getHashCode('' + programName) %
                pageData.NUM_KITTENS;
      return '/static/img/kittens/grey/' + kittenNum + '.jpg';
    },

    render: function() {
      var author_pic_url;
      var anon = false;
      if (this.props.data.author) {
        if (this.props.data.author.profile_pic_url) {
          author_pic_url = this.props.data.author.profile_pic_url;
        } else if (this.props.data.author.program_name) {
          author_pic_url = this.getProgramAvatar();
        } else {
          author_pic_url = this.getAnonAvatar()
          anon = true;
        }
      } else {
        author_pic_url = this.getAnonAvatar();
        anon = true;
      }

      return (
        React.DOM.div({className: "row-fluid"}, 
          React.DOM.div({className: "span3 author"}, 
            React.DOM.img({class: "img-rounded", width: "50", height: "50", 
                src: author_pic_url, className: "author-pic"}), 
            CommentData({author: this.props.data.author, anon: anon, 
                date: this.props.data.comment_date.$date}
            )
          ), 
          React.DOM.div({className: "comment-text span9"}, 
            this.props.data.comment
          )
        )
      );
    }
  });

  var adjectiveMap = {
    'interest': 'Liked it',
    'easiness': 'easy',
    'usefulness': 'useful',
    'clarity': 'clear',
    'passion': 'engaging',
    '': ''
  };

  var BinaryRating = React.createClass({displayName: 'BinaryRating',
    render: function() {
      var cx = React.addons.classSet;
      var yes_btn_classes = cx({
        'btn yes-btn disabled': true,
        'active btn-success': this.props.data.rating === 1
      });
      var no_btn_classes = cx({
        'btn no-btn disabled': true,
        'active btn-danger': this.props.data.rating === 0
      });
      return (
        React.DOM.div({className: "row-fluid read-only"}, 
          React.DOM.span({className: "span5 choice-name"}, 
            _.str.capitalize(adjectiveMap[this.props.data.name]) + '?'
          ), 
          React.DOM.span({className: "span7 btn-group rating-choices"}, 
            React.DOM.button({type: "button", className: yes_btn_classes}, 
              React.DOM.i({className: "thumb-icon icon-thumbs-up"}), 
              "Yes"
            ), 
            React.DOM.button({type: "button", className: no_btn_classes}, 
              React.DOM.i({className: "thumb-icon icon-thumbs-down"}), 
              "No"
            )
          )
        )
      );
    }
  });

  var RatingBox = React.createClass({displayName: 'RatingBox',
    render: function() {
      var ratings = this.props.data.map(function(rating) {
        return (
          BinaryRating({data: rating})
        );
      });
      return (
        React.DOM.div(null, 
          ratings
        )
      );
    }
  });

  var Review = React.createClass({displayName: 'Review',
    render: function() {
      return (
        React.DOM.div({className: "row-fluid"}, 
          React.DOM.div({className: "span8"}, 
            Comment({data: this.props.data})
          ), 
          React.DOM.div({className: "span4"}, 
            RatingBox({data: this.props.data.ratings})
          )
        )
      )
    }
  });

  var ReviewList = React.createClass({displayName: 'ReviewList',
    render: function() {
      var sortedReviews =  _.sortBy(this.props.data,
          function(r) {
            return -r.comment_date.$date;
          }
      );

      var reviewNodes = sortedReviews.map(function (review) {
        return (
          React.DOM.div({className: "review-post"}, 
            Review({data: review})
          )
        );
      });
      return (
        React.DOM.div(null, 
          reviewNodes
        )
      );
    }
  });

  var ReviewBox = React.createClass({displayName: 'ReviewBox',
    render: function() {
      return (
        React.DOM.div(null, 
          React.DOM.h2({class: "tip-title"}, "Course Comments"), 
          ReviewList({data: this.props.data})
        )
      );
    }
  });

  React.renderComponent(
    ReviewBox({data: window.pageData.tipObjs}),
    document.getElementById('tips-collection-container')
  );

  // TODO(david): Handle no professors for course
  var profsCollection = courseModel.get('professors');
  var profsView = new prof.ProfCollectionView({ collection: profsCollection });
  $('#professor-review-container').html(profsView.render().el);

  if (!window.pageData.currentUserId) {
    _sign_in.renderBanner({
      source: 'BANNER_COURSE_PAGE',
      nextUrl: window.location.href
    });
  }

  mixpanel.track('Impression: Single course page');

  $(document.body).trigger('pageScriptComplete');
});
