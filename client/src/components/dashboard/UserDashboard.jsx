import {useState, useEffect, useMemo} from 'react';
import {useAuth} from '../../context/authContext';
import {
   fetchUserStats,
   fetchUserCalls,
   initiateCall,
} from '../../api/dashboard';

function StatusBadge({status}) {
   const s = (status || 'pending').toLowerCase().replace(/\s+/g, '-');
   return (
      <span className={`status-badge status-badge--${s}`}>
         {status || 'Pending'}
      </span>
   );
}

function CallDetailModal({call, onClose}) {
   if (!call) return null;

   const lines = [];
   if (call.transcript) {
      const raw = call.transcript.trim();
      const parts = raw.split(/\n/);
      for (const line of parts) {
         const match = line.match(/^(agent|callee|assistant|user|caller):\s*/i);
         if (match) {
            const role = match[1].toLowerCase();
            const isAgent = role === 'agent' || role === 'assistant';
            lines.push({
               role: isAgent ? 'agent' : 'callee',
               text: line.slice(match[0].length),
            });
         } else if (lines.length > 0) {
            lines[lines.length - 1].text += '\n' + line;
         } else {
            lines.push({role: 'agent', text: line});
         }
      }
   }

   return (
      <div className='modal-overlay' onClick={onClose}>
         <div className='modal-content' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
               <div className='modal-header__info'>
                  <div className='modal-title'>
                     <span>&#128222;</span> Call Details
                  </div>
                  <div className='modal-subtitle'>
                     {call.phone_number} &middot;{' '}
                     {new Date(call.created_at).toLocaleString()}
                  </div>
               </div>
               <button className='modal-close' onClick={onClose}>
                  &times;
               </button>
            </div>
            <div className='modal-body'>
               <div>
                  <div className='modal-section__label'>Status</div>
                  <StatusBadge status={call.status} />
               </div>
               <div>
                  <div className='modal-section__label'>Goal</div>
                  <div className='modal-section__text'>
                     {call.goal || 'N/A'}
                  </div>
               </div>
               {call.outcome && (
                  <div>
                     <div className='modal-section__label'>Outcome</div>
                     <div className='modal-section__text'>{call.outcome}</div>
                  </div>
               )}
               {lines.length > 0 && (
                  <div>
                     <div className='modal-section__label'>Transcript</div>
                     <div className='transcript'>
                        {lines.map((msg, i) => (
                           <div
                              key={i}
                              className={`transcript__msg transcript__msg--${msg.role}`}
                           >
                              <div className='transcript__msg-label'>
                                 {msg.role === 'agent' ? 'Agent' : 'Callee'}
                              </div>
                              {msg.text}
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}

export default function UserDashboard() {
   const {token, user, logout} = useAuth();

   const [
      stats,
      setStats,
   ] = useState({apiCallsUsed: 0, apiCallsLimit: 20});
   const [
      calls,
      setCalls,
   ] = useState([]);
   const [
      to,
      setTo,
   ] = useState('');
   const [
      goal,
      setGoal,
   ] = useState('');
   const [
      error,
      setError,
   ] = useState('');
   const [
      loading,
      setLoading,
   ] = useState(false);
   const [
      selectedCall,
      setSelectedCall,
   ] = useState(null);

   useEffect(() => {
      const handleAuthError = (err) => {
         if (err.message === 'User not found') logout();
      };
      fetchUserStats(token).then(setStats).catch(handleAuthError);
      fetchUserCalls(token)
         .then((d) => setCalls(d.calls ?? []))
         .catch(handleAuthError);
   }, [
      token,
      logout,
   ]);

   const callCounts = useMemo(() => {
      const counts = {completed: 0, failed: 0, inProgress: 0};
      for (const c of calls) {
         const s = (c.status || '').toLowerCase();
         if (s === 'completed') counts.completed++;
         else if (s === 'failed' || s === 'error') counts.failed++;
         else counts.inProgress++;
      }
      return counts;
   }, [
      calls,
   ]);

   const remaining = stats.apiCallsLimit - stats.apiCallsUsed;
   const usagePercent =
      stats.apiCallsLimit > 0
         ? Math.min((stats.apiCallsUsed / stats.apiCallsLimit) * 100, 100)
         : 0;
   const exhausted = remaining <= 0;

   const handleCall = async (e) => {
      e.preventDefault();
      if (!to.trim() || !goal.trim()) {
         setError('Phone number and goal are required');
         return;
      }
      setLoading(true);
      setError('');
      try {
         const data = await initiateCall(token, {to, goal});
         setCalls((prev) => [
            {
               ...data,
               phone_number: to,
               created_at: new Date().toISOString(),
            },
            ...prev,
         ]);
         setStats((prev) => ({...prev, apiCallsUsed: prev.apiCallsUsed + 1}));
         setTo('');
         setGoal('');
      } catch (err) {
         setError(err.message || 'Call failed');
      } finally {
         setLoading(false);
      }
   };

   return (
      <>
         <nav className='nav-bar'>
            <div className='nav-logo'>
               <span className='nav-logo__icon'>&#128222;</span>
               Respondy
            </div>
            <div className='nav-actions'>
               {user?.role === 'admin' && (
                  <span className='badge--admin'>Admin</span>
               )}
               <span className='nav-user'>{user?.name || user?.email}</span>
               <button className='btn btn--outline' onClick={logout}>
                  Sign out
               </button>
            </div>
         </nav>

         <div className='dashboard'>
            <div className='page-header'>
               <h1 className='page-header__title'>Dashboard</h1>
               <p className='page-header__subtitle'>
                  Manage your AI phone calls
               </p>
            </div>

            <div className='stats-grid section'>
               <div className='card'>
                  <div className='card__header'>
                     <div className='card__title'>
                        API Usage
                        <span
                           className={`card__title-right${exhausted ? ' status-badge--failed' : ''}`}
                        >
                           {stats.apiCallsUsed} / {stats.apiCallsLimit}
                        </span>
                     </div>
                  </div>
                  <div className='card__content'>
                     <div className='progress-bar'>
                        <div
                           className={`progress-bar__fill${exhausted ? ' progress-bar__fill--danger' : ''}`}
                           style={{width: `${usagePercent}%`}}
                        />
                     </div>
                     <p className='progress-text'>
                        {exhausted
                           ? 'You have exhausted your free calls'
                           : `${remaining} call${remaining !== 1 ? 's' : ''} remaining`}
                     </p>
                  </div>
               </div>

               <div className='card'>
                  <div className='card__header'>
                     <div className='card__title'>Call Summary</div>
                  </div>
                  <div className='card__content'>
                     <div className='summary-rows'>
                        <div className='summary-row'>
                           <span className='summary-row__label'>
                              <span className='summary-row__dot summary-row__dot--green'></span>
                              Completed
                           </span>
                           <span className='summary-row__value'>
                              {callCounts.completed}
                           </span>
                        </div>
                        <div className='summary-row'>
                           <span className='summary-row__label'>
                              <span className='summary-row__dot summary-row__dot--red'></span>
                              Failed
                           </span>
                           <span className='summary-row__value'>
                              {callCounts.failed}
                           </span>
                        </div>
                        <div className='summary-row'>
                           <span className='summary-row__label'>
                              <span className='summary-row__dot summary-row__dot--blue'></span>
                              In Progress
                           </span>
                           <span className='summary-row__value'>
                              {callCounts.inProgress}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className='card section'>
               <div className='card__header'>
                  <div className='card__title'>
                     <span className='card__title-icon'>&#128222;</span>
                     Initiate New Call
                  </div>
                  <p className='card__description'>
                     Provide a phone number and describe the goal for your AI
                     agent.
                  </p>
               </div>
               <div className='card__content'>
                  {error && (
                     <p className='dashboard__error' role='alert'>
                        {error}
                     </p>
                  )}
                  {exhausted ? (
                     <div className='alert alert--warning'>
                        <span className='alert__icon'>&#9888;&#65039;</span>
                        <div className='alert__text'>
                           <div className='alert__title'>Quota exhausted</div>
                           <div className='alert__description'>
                              You have used all {stats.apiCallsLimit} free
                              calls.
                           </div>
                        </div>
                     </div>
                  ) : (
                     <form onSubmit={handleCall}>
                        <div
                           className='form-grid form-grid--2col'
                           style={{marginBottom: 16}}
                        >
                           <div className='form-group'>
                              <label className='form-label'>Phone Number</label>
                              <input
                                 className='form-input'
                                 type='tel'
                                 value={to}
                                 onChange={(e) => {
                                    setTo(e.target.value);
                                    setError('');
                                 }}
                                 placeholder='+17785550000'
                              />
                              <span className='form-helper'>
                                 E.164 format recommended
                              </span>
                           </div>
                           <div className='form-group'>
                              <label className='form-label'>
                                 Remaining Calls
                              </label>
                              <input
                                 className='form-input'
                                 value={remaining}
                                 disabled
                              />
                           </div>
                        </div>
                        <div className='form-group' style={{marginBottom: 16}}>
                           <label className='form-label'>
                              Conversation Goal
                           </label>
                           <textarea
                              className='form-textarea'
                              value={goal}
                              onChange={(e) => {
                                 setGoal(e.target.value);
                                 setError('');
                              }}
                              placeholder='e.g. Book an appointment for Tuesday at 2 pm'
                              rows={3}
                           />
                           <span className='form-helper'>
                              Your goal is screened for prompt injection before
                              the call begins.
                           </span>
                        </div>
                        <button
                           className='btn btn--primary'
                           type='submit'
                           disabled={loading}
                           style={{width: '100%'}}
                        >
                           {loading
                              ? 'Initiating call\u2026'
                              : '\u{1F4DE} Make Call'}
                        </button>
                     </form>
                  )}
               </div>
            </div>

            <div className='card section'>
               <div className='card__header card__header--with-border'>
                  <div className='card__title'>Call History</div>
                  <p className='card__description'>
                     Review your past calls and transcripts
                  </p>
               </div>
               <div className='card__content--flush'>
                  {calls.length === 0 ? (
                     <div className='empty-state'>
                        <div className='empty-state__icon'>&#128222;</div>
                        <div className='empty-state__title'>No calls yet</div>
                        <div className='empty-state__text'>
                           Make your first call to get started
                        </div>
                     </div>
                  ) : (
                     <ul className='call-list'>
                        {calls.map((c) => (
                           <li
                              key={c.id || c.callSid}
                              className='call-row'
                              onClick={() => setSelectedCall(c)}
                           >
                              <div className='call-row__left'>
                                 <div className='call-row__icon'>&#128222;</div>
                                 <div className='call-row__info'>
                                    <div className='call-row__phone'>
                                       {c.phone_number || c.to}
                                    </div>
                                    <div className='call-row__goal'>
                                       {c.goal || 'No goal specified'}
                                    </div>
                                 </div>
                              </div>
                              <div className='call-row__right'>
                                 <StatusBadge status={c.status} />
                                 <span className='call-row__date'>
                                    {new Date(
                                       c.created_at,
                                    ).toLocaleDateString()}
                                 </span>
                                 <span className='call-row__chevron'>
                                    &#8250;
                                 </span>
                              </div>
                           </li>
                        ))}
                     </ul>
                  )}
               </div>
            </div>
         </div>

         {selectedCall && (
            <CallDetailModal
               call={selectedCall}
               onClose={() => setSelectedCall(null)}
            />
         )}
      </>
   );
}
