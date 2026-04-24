import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addBoardComment,
  addBoardMember,
  addBoardItem,
  addFolderListing,
  askAssistant,
  createBoard,
  createChecklistItem,
  createFolder,
  fetchWorkspace,
  scheduleTour,
  updateChecklistItem,
  updateNotificationPreferences,
  updateTour
} from '../api/client';
import { useToast } from '../components/ToastContext';
import './WorkspacePage.css';

function formatCurrency(value) {
  return value ? `$${Number(value).toLocaleString()}` : 'N/A';
}

function getWorkspaceSuggestions(workspace) {
  const seen = new Set();
  const suggestions = [];

  const appendProperty = (property) => {
    if (!property?.L_ListingID || seen.has(property.L_ListingID)) {
      return;
    }

    seen.add(property.L_ListingID);
    suggestions.push(property);
  };

  (workspace?.recommendations || []).forEach(appendProperty);
  (workspace?.folders || []).forEach((folder) =>
    (folder.items || []).forEach((item) => appendProperty(item.property))
  );
  (workspace?.tours || []).forEach((tour) => appendProperty(tour.property));
  (workspace?.boards || []).forEach((board) =>
    (board.items || []).forEach((item) => appendProperty(item.property))
  );

  return suggestions;
}

function WorkspacePage() {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [folderName, setFolderName] = useState('');
  const [tourDraft, setTourDraft] = useState({ listingId: '', scheduledFor: '' });
  const [checklistTitle, setChecklistTitle] = useState('');
  const [checklistListingId, setChecklistListingId] = useState('');
  const [boardDraft, setBoardDraft] = useState({ name: '', description: '' });
  const [boardItemDraft, setBoardItemDraft] = useState({ boardId: '', listingId: '', comment: '' });
  const [boardMemberDrafts, setBoardMemberDrafts] = useState({});
  const [boardCommentDrafts, setBoardCommentDrafts] = useState({});
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [assistantReply, setAssistantReply] = useState('');

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWorkspace();
      setWorkspace(data);
    } catch (error) {
      pushToast('Unable to load workspace right now.', 'error');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  if (loading) {
    return <div className="workspace-page"><div className="panel workspace-panel">Loading workspace...</div></div>;
  }

  const preferences = workspace?.preferences || {};
  const listingSuggestions = getWorkspaceSuggestions(workspace);

  return (
    <div className="workspace-page">
      <section className="workspace-hero panel">
        <div>
          <span className="section-kicker">Buyer workspace</span>
          <h1>Plan, compare, collaborate, and move toward an offer</h1>
          <p>
            This hub pulls together folders, tours, transaction tasks, collaboration boards,
            smarter alerts, and recommendation guidance around your home search.
          </p>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="workspace-column">
          <div className="panel workspace-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Folders</span>
                <h2>Shortlists and notes</h2>
              </div>
            </div>
            <div className="workspace-form-row">
              <input
                type="text"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="Create a folder like Dream Homes"
              />
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  await createFolder({ name: folderName || 'New Folder' });
                  setFolderName('');
                  pushToast('Folder created.', 'success');
                  loadWorkspace();
                }}
              >
                New folder
              </button>
            </div>

            <div className="folder-grid">
              {(workspace?.folders || []).map((folder) => (
                <div key={folder.id} className="folder-card">
                  <div className="folder-card-top">
                    <strong>{folder.name}</strong>
                    <span>{folder.itemCount} homes</span>
                  </div>
                  {(folder.items || []).slice(0, 3).map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className="mini-property-row"
                      onClick={() => navigate(`/property/${item.listing_id}`)}
                    >
                      <span>{item.property?.summary?.address || `MLS ${item.listing_id}`}</span>
                      <small>{item.note || item.stage}</small>
                    </button>
                  ))}
                  <div className="workspace-inline-action">
                    <select
                      value={workspace?._folderDrafts?.[folder.id] || ''}
                      onChange={(event) =>
                        setWorkspace((prev) => ({
                          ...prev,
                          _folderDrafts: {
                            ...(prev?._folderDrafts || {}),
                            [folder.id]: event.target.value
                          }
                        }))
                      }
                    >
                      <option value="">Pick a suggested listing</option>
                      {listingSuggestions.map((property) => (
                        <option key={property.L_ListingID} value={property.L_ListingID}>
                          {property.summary?.address || property.L_ListingID}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="MLS to add"
                      value={workspace?._folderDrafts?.[folder.id] || ''}
                      onChange={(event) =>
                        setWorkspace((prev) => ({
                          ...prev,
                          _folderDrafts: {
                            ...(prev?._folderDrafts || {}),
                            [folder.id]: event.target.value
                          }
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={async () => {
                        const listingId = workspace?._folderDrafts?.[folder.id];
                        if (!listingId) return;
                        await addFolderListing(folder.id, { listingId });
                        pushToast('Home added to folder.', 'success');
                        loadWorkspace();
                      }}
                    >
                      Add home
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel workspace-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Tours</span>
                <h2>Tour scheduler</h2>
              </div>
            </div>
            <div className="workspace-form-row">
              <select
                value={tourDraft.listingId}
                onChange={(event) =>
                  setTourDraft((prev) => ({ ...prev, listingId: event.target.value }))
                }
              >
                <option value="">Pick a suggested listing</option>
                {listingSuggestions.map((property) => (
                  <option key={property.L_ListingID} value={property.L_ListingID}>
                    {property.summary?.address || property.L_ListingID}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="MLS number"
                value={tourDraft.listingId}
                onChange={(event) =>
                  setTourDraft((prev) => ({ ...prev, listingId: event.target.value }))
                }
              />
              <input
                type="datetime-local"
                value={tourDraft.scheduledFor}
                onChange={(event) =>
                  setTourDraft((prev) => ({ ...prev, scheduledFor: event.target.value }))
                }
              />
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  await scheduleTour(tourDraft);
                  setTourDraft({ listingId: '', scheduledFor: '' });
                  pushToast('Tour scheduled.', 'success');
                  loadWorkspace();
                }}
              >
                Schedule
              </button>
            </div>
            <div className="workspace-list">
              {(workspace?.tours || []).map((tour) => (
                <div key={tour.id} className="workspace-list-item">
                  <div>
                    <strong>{tour.property?.summary?.address || `MLS ${tour.listing_id}`}</strong>
                    <span>{new Date(tour.scheduled_for).toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={async () => {
                      await updateTour(tour.id, {
                        status: tour.status === 'scheduled' ? 'completed' : 'scheduled'
                      });
                      loadWorkspace();
                    }}
                  >
                    {tour.status === 'scheduled' ? 'Mark complete' : 'Re-open'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="panel workspace-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Transactions</span>
                <h2>Offer and closing checklist</h2>
              </div>
            </div>
            <div className="workspace-form-row">
              <select
                value={checklistListingId}
                onChange={(event) => setChecklistListingId(event.target.value)}
              >
                <option value="">Attach a suggested listing</option>
                {listingSuggestions.map((property) => (
                  <option key={property.L_ListingID} value={property.L_ListingID}>
                    {property.summary?.address || property.L_ListingID}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Checklist item"
                value={checklistTitle}
                onChange={(event) => setChecklistTitle(event.target.value)}
              />
              <input
                type="text"
                placeholder="Optional MLS"
                value={checklistListingId}
                onChange={(event) => setChecklistListingId(event.target.value)}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  await createChecklistItem({
                    title: checklistTitle,
                    listingId: checklistListingId
                  });
                  setChecklistTitle('');
                  setChecklistListingId('');
                  pushToast('Checklist item added.', 'success');
                  loadWorkspace();
                }}
              >
                Add task
              </button>
            </div>
            <div className="workspace-list">
              {(workspace?.checklist || []).map((item) => (
                <div key={item.id} className="workspace-list-item">
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.property?.summary?.address || item.listing_id || 'General task'}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={async () => {
                      await updateChecklistItem(item.id, {
                        status: item.status === 'done' ? 'todo' : 'done'
                      });
                      loadWorkspace();
                    }}
                  >
                    {item.status === 'done' ? 'Done' : 'Mark done'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="workspace-column">
          <div className="panel workspace-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Collaboration</span>
                <h2>Shared boards</h2>
              </div>
            </div>
            <div className="workspace-form-row">
              <input
                type="text"
                placeholder="Board name"
                value={boardDraft.name}
                onChange={(event) =>
                  setBoardDraft((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                type="text"
                placeholder="Description"
                value={boardDraft.description}
                onChange={(event) =>
                  setBoardDraft((prev) => ({ ...prev, description: event.target.value }))
                }
              />
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  await createBoard(boardDraft);
                  setBoardDraft({ name: '', description: '' });
                  pushToast('Board created.', 'success');
                  loadWorkspace();
                }}
              >
                Create
              </button>
            </div>
            <div className="workspace-form-row">
              <select
                value={boardItemDraft.boardId}
                onChange={(event) =>
                  setBoardItemDraft((prev) => ({ ...prev, boardId: event.target.value }))
                }
              >
                <option value="">Choose board</option>
                {(workspace?.boards || []).map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
              <select
                value={boardItemDraft.listingId}
                onChange={(event) =>
                  setBoardItemDraft((prev) => ({ ...prev, listingId: event.target.value }))
                }
              >
                <option value="">Pick a suggested listing</option>
                {listingSuggestions.map((property) => (
                  <option key={property.L_ListingID} value={property.L_ListingID}>
                    {property.summary?.address || property.L_ListingID}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="MLS to share"
                value={boardItemDraft.listingId}
                onChange={(event) =>
                  setBoardItemDraft((prev) => ({ ...prev, listingId: event.target.value }))
                }
              />
              <input
                type="text"
                placeholder="Comment"
                value={boardItemDraft.comment}
                onChange={(event) =>
                  setBoardItemDraft((prev) => ({ ...prev, comment: event.target.value }))
                }
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={async () => {
                  if (!boardItemDraft.boardId) return;
                  await addBoardItem(boardItemDraft.boardId, boardItemDraft);
                  setBoardItemDraft({ boardId: '', listingId: '', comment: '' });
                  pushToast('Shared board updated.', 'success');
                  loadWorkspace();
                }}
              >
                Add listing
              </button>
            </div>
            <div className="workspace-list">
              {(workspace?.boards || []).map((board) => (
                <div key={board.id} className="board-card">
                  <strong>{board.name}</strong>
                  <span>{board.description || 'Shared planning board'}</span>
                  <div className="workspace-inline-action">
                    <input
                      type="email"
                      placeholder="Invite collaborator by email"
                      value={boardMemberDrafts[board.id] || ''}
                      onChange={(event) =>
                        setBoardMemberDrafts((prev) => ({
                          ...prev,
                          [board.id]: event.target.value
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={async () => {
                        const email = boardMemberDrafts[board.id];
                        if (!email) return;
                        await addBoardMember(board.id, { email, roleName: 'editor' });
                        pushToast('Collaborator invited to board.', 'success');
                        setBoardMemberDrafts((prev) => ({ ...prev, [board.id]: '' }));
                        loadWorkspace();
                      }}
                    >
                      Invite
                    </button>
                  </div>
                  {(board.members || []).length > 0 && (
                    <div className="member-row">
                      {board.members.map((member) => (
                        <span key={member.id} className="member-pill">
                          {member.email}
                        </span>
                      ))}
                    </div>
                  )}
                  {(board.items || []).slice(0, 3).map((item) => (
                    <div key={item.id} className="board-item-shell">
                      <button
                        type="button"
                        className="mini-property-row"
                        onClick={() => navigate(`/property/${item.listing_id}`)}
                      >
                        <span>{item.property?.summary?.address || `MLS ${item.listing_id}`}</span>
                        <small>{item.comment || item.reaction}</small>
                      </button>
                      {(item.comments || []).slice(0, 2).map((comment) => (
                        <span key={comment.id} className="board-comment">
                          {comment.author_name}: {comment.body}
                        </span>
                      ))}
                      <div className="workspace-inline-action">
                        <input
                          type="text"
                          placeholder="Add comment"
                          value={boardCommentDrafts[item.id] || ''}
                          onChange={(event) =>
                            setBoardCommentDrafts((prev) => ({
                              ...prev,
                              [item.id]: event.target.value
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={async () => {
                            const body = boardCommentDrafts[item.id];
                            if (!body) return;
                            await addBoardComment(item.id, { body });
                            pushToast('Comment added.', 'success');
                            setBoardCommentDrafts((prev) => ({ ...prev, [item.id]: '' }));
                            loadWorkspace();
                          }}
                        >
                          Comment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="panel workspace-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Recommendations</span>
                <h2>Homes you may also like</h2>
              </div>
            </div>
            <div className="recommendation-grid">
              {(workspace?.recommendations || []).map((property) => (
                <button
                  type="button"
                  key={property.L_ListingID}
                  className="recommendation-card"
                  onClick={() => navigate(`/property/${property.L_ListingID}`)}
                >
                  <strong>{property.summary?.address}</strong>
                  <span>{property.summary?.city}, {property.summary?.state}</span>
                  <span>{formatCurrency(property.summary?.price)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel workspace-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Alerts</span>
                <h2>Notification settings</h2>
              </div>
            </div>
            <div className="prefs-grid">
              {[
                ['instant_alerts', 'Instant alerts'],
                ['daily_digest', 'Daily digest'],
                ['price_drops', 'Price drop alerts'],
                ['open_houses', 'Open house alerts']
              ].map(([key, label]) => (
                <label key={key} className="pref-item">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences[key])}
                    onChange={async (event) => {
                      const next = {
                        instantAlerts: key === 'instant_alerts' ? event.target.checked : Boolean(preferences.instant_alerts),
                        dailyDigest: key === 'daily_digest' ? event.target.checked : Boolean(preferences.daily_digest),
                        priceDrops: key === 'price_drops' ? event.target.checked : Boolean(preferences.price_drops),
                        openHouses: key === 'open_houses' ? event.target.checked : Boolean(preferences.open_houses)
                      };
                      await updateNotificationPreferences(next);
                      pushToast('Notification settings updated.', 'success');
                      loadWorkspace();
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="panel workspace-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">AI guide</span>
                <h2>Search coach</h2>
              </div>
            </div>
            <div className="assistant-shell">
              <textarea
                value={assistantPrompt}
                onChange={(event) => setAssistantPrompt(event.target.value)}
                placeholder="Ask for help narrowing homes, planning tours, or deciding next steps."
              />
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  const data = await askAssistant({ message: assistantPrompt });
                  setAssistantReply(data.reply || '');
                }}
              >
                Ask assistant
              </button>
              {assistantReply && <p className="assistant-reply">{assistantReply}</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default WorkspacePage;
