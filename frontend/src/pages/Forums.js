import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Forums.css';

const Forums = ({ isResearcher = false }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [newPost, setNewPost] = useState({
    category_id: '',
    title: '',
    content: '',
  });
  const [replyContent, setReplyContent] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchCategories();
    fetchPosts();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/forums/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory) params.category_id = selectedCategory;

      const response = await api.get('/forums/posts', { params });
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  const fetchPostDetails = async (postId) => {
    try {
      const response = await api.get(`/forums/posts/${postId}`);
      setSelectedPost(response.data);
    } catch (error) {
      console.error('Failed to fetch post details:', error);
    }
  };

  const createPost = async (e) => {
    e.preventDefault();
    try {
      await api.post('/forums/posts', newPost);
      setShowPostModal(false);
      setNewPost({ category_id: '', title: '', content: '' });
      fetchPosts();
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create post');
    }
  };

  const createReply = async (e) => {
    e.preventDefault();
    if (!selectedPost) return;

    // Double-check: only researchers can reply
    if (!isResearcher) {
      alert('Only researchers can reply to posts. Patients can post questions but cannot reply.');
      return;
    }

    try {
      await api.post(`/forums/posts/${selectedPost.id}/replies`, {
        content: replyContent,
      });
      setShowReplyModal(false);
      setReplyContent('');
      fetchPostDetails(selectedPost.id);
    } catch (error) {
      console.error('Failed to create reply:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create reply';
      alert(errorMessage);
    }
  };

  const createCategory = async (e) => {
    e.preventDefault();
    if (!isResearcher) return;

    try {
      await api.post('/forums/categories', newCategory);
      setShowCategoryModal(false);
      setNewCategory({ name: '', description: '' });
      fetchCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('Failed to create category');
    }
  };

  return (
    <>
      <Navbar isPatient={!isResearcher} />
      <div className="forums-page">
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">Forums</h1>
            {isResearcher && (
              <button onClick={() => setShowCategoryModal(true)} className="btn btn-primary">
                Create Category
              </button>
            )}
          </div>

          <div className="forums-layout">
            <div className="forums-sidebar">
              <h3>Categories</h3>
              <button
                className={`category-btn ${!selectedCategory ? 'active' : ''}`}
                onClick={() => setSelectedCategory('')}
              >
                All Posts
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`category-btn ${selectedCategory === category.id.toString() ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id.toString())}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="forums-main">
              <div className="forums-header">
                <div>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#333' }}>
                    {selectedCategory ? categories.find(c => c.id.toString() === selectedCategory)?.name : 'All Posts'}
                  </h2>
                  {!isResearcher && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                      Post your questions here. Researchers will respond with expert answers.
                    </p>
                  )}
                </div>
                <button onClick={() => setShowPostModal(true)} className="btn btn-primary">
                  {isResearcher ? 'Ask Question' : 'Post Question'}
                </button>
              </div>

              {loading ? (
                <div className="loading">Loading posts...</div>
              ) : (
                <div className="posts-list">
                  {posts.map((post) => (
                    <div key={post.id} className="card post-card">
                      <h3>{post.title}</h3>
                      <p className="post-meta">
                        By {post.author_name} • {post.category_name} • {new Date(post.created_at).toLocaleDateString()}
                      </p>
                      <p className="post-summary">{post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content}</p>
                      <div className="post-actions">
                        <button
                          onClick={() => {
                            fetchPostDetails(post.id);
                            setShowReplyModal(true);
                          }}
                          className="btn-view-details"
                        >
                          View {isResearcher ? '& Reply' : 'Details'}
                        </button>
                        {post.reply_count > 0 && (
                          <span className="reply-count">{post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {posts.length === 0 && (
                    <p className="text-muted text-center">No posts found.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Create Post Modal */}
          {showPostModal && (
            <div className="modal-overlay" onClick={() => setShowPostModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>{isResearcher ? 'Ask Question' : 'Post Question'}</h2>
                <form onSubmit={createPost}>
                  <div className="input-group">
                    <label>Category *</label>
                    <select
                      value={newPost.category_id}
                      onChange={(e) => setNewPost({ ...newPost, category_id: e.target.value })}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Title *</label>
                    <input
                      type="text"
                      value={newPost.title}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Content *</label>
                    <textarea
                      value={newPost.content}
                      onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                      required
                      rows="6"
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => setShowPostModal(false)} className="btn btn-outline">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">Post</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* View Post & Reply Modal */}
          {showReplyModal && selectedPost && (
            <div className="modal-overlay" onClick={() => {
              setShowReplyModal(false);
              setSelectedPost(null);
            }}>
              <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="post-header">
                  <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 700, color: '#333' }}>{selectedPost.title}</h2>
                  <p className="post-meta">
                    By <strong>{selectedPost.author_name}</strong> ({selectedPost.user_type === 'patient' ? 'Patient' : 'Researcher'}) • {selectedPost.category_name} • {new Date(selectedPost.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="post-content">
                  <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#333', margin: '0' }}>{selectedPost.content}</p>
                </div>

                <h3 className="mt-20" style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '24px', marginBottom: '16px' }}>Replies ({selectedPost.replies?.length || 0})</h3>
                {selectedPost.replies && selectedPost.replies.length > 0 ? (
                  <div className="replies-list">
                    {selectedPost.replies.map((reply) => (
                      <div key={reply.id} className="reply-card">
                        <p className="post-meta">
                          By <strong>{reply.author_name}</strong> {reply.user_type === 'researcher' && <span className="researcher-badge">Researcher</span>} • {new Date(reply.created_at).toLocaleDateString()}
                        </p>
                        <p>{reply.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No replies yet.</p>
                )}

                {isResearcher && (
                  <form onSubmit={createReply} className="mt-20">
                    <div className="input-group">
                      <label>Your Reply *</label>
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        required
                        rows="4"
                        placeholder="Share your expertise and help answer this question..."
                      />
                    </div>
                    <button type="submit" className="btn btn-primary">Reply</button>
                  </form>
                )}
                {!isResearcher && selectedPost && (
                  <div className="info-box mt-20" style={{ padding: '16px', background: '#f0f8ff', borderRadius: '8px', fontSize: '14px', color: '#666' }}>
                    <strong>💡 Note:</strong> Only researchers can reply to questions. If you have a follow-up question, please create a new post.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowReplyModal(false);
                    setSelectedPost(null);
                  }}
                  className="btn btn-outline mt-20"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Create Category Modal */}
          {showCategoryModal && (
            <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Create Category</h2>
                <form onSubmit={createCategory}>
                  <div className="input-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Description</label>
                    <textarea
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                      rows="3"
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => setShowCategoryModal(false)} className="btn btn-outline">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">Create</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Forums;

