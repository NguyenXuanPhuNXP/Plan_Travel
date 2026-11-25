import { useImperativeHandle, useState } from 'react';
import { Wallet, Plus, Pencil, Users, ReceiptText, Trash2 } from 'lucide-react';
import PlanDialog from './PlanDialog';
import ExpenseDialog from './ExpenseDialog';
import { expenseBalances, planExpenses } from '../../utils/tripExpenses';
import './TripBudget.css';

const money = value => `${Number(value).toLocaleString('vi-VN')} đ`;

export default function TripBudget({ plan, onChange, onMembersClick, owner = plan.owner || { id: plan.userId, name: 'Chủ kế hoạch' }, currentUserId, dialogRef, children }) {
  const [modal, setModal] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [settings, setSettings] = useState({ budget: '', travelerCount: 1 });
  const expenses = planExpenses(plan);
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const remaining = Number(plan.budget || 0) - total;
  const participants = [{ id: String(owner.id || ''), name: owner.name || owner.fullName || 'Chủ kế hoạch' }, ...(plan.collaborators || []).filter(member => member.userId).map(member => ({ id: String(member.userId), name: member.name || member.user?.name || member.user?.fullName || member.email || 'Thành viên' }))].filter(member => member.id);
  const editable = typeof onChange === 'function';
  const close = () => setModal(null);
  useImperativeHandle(dialogRef, () => ({ openMembers: () => setModal('members') }));
  const saveExpense = expense => {
    onChange('expenses', editingExpense ? expenses.map(item => item.id === expense.id ? expense : item) : [...expenses, expense]);
    close();
  };
  const openExpense = expense => { setEditingExpense(expense || null); setModal('expense'); };
  const openBudget = () => { setSettings({ budget: plan.budget || '', travelerCount: Math.max(Number(plan.travelerCount) || 1, participants.length) }); setModal('budget'); };
  const nameOf = id => participants.find(member => member.id === id)?.name || 'Chưa xác định người trả';
  const balances = expenseBalances(expenses);
  return <section className="trip-budget">
    <header className="trip-budget-heading"><h2><Wallet size={23} /> Lập ngân sách</h2>{editable && <button type="button" className="btn btn-primary" onClick={() => openExpense()}><Plus size={17} /> Thêm chi phí</button>}</header>
    <div className="trip-budget-summary"><div className="trip-budget-amount"><strong>{money(total)}</strong><span>Tổng chi phí đã nhập</span></div><div className="trip-budget-limit"><span>Ngân sách: {Number(plan.budget) > 0 ? money(plan.budget) : 'Chưa đặt'}</span><progress aria-label="Chi phí so với ngân sách" max={Number(plan.budget) || 1} value={Math.min(total, Number(plan.budget) || 0)} /></div>
      <div className="trip-budget-actions">{editable && <button type="button" onClick={openBudget}><Pencil size={16} /> Chỉnh sửa ngân sách</button>}<button type="button" onClick={() => setModal('balances')}><ReceiptText size={16} /> Số dư nhóm</button>{(children || onMembersClick) && <button type="button" onClick={() => children ? setModal('members') : onMembersClick()}><Users size={16} /> Thêm bạn đồng hành</button>}</div>
      {Number(plan.budget) > 0 && <p className={remaining < 0 ? 'trip-budget-over' : ''}>{remaining < 0 ? `Vượt ngân sách ${money(-remaining)}` : `Còn lại ${money(remaining)}`}</p>}
    </div>
    <section className="trip-expense-list"><h3>Chi phí <span>({expenses.length})</span></h3>{!expenses.length && <p>Bạn chưa thêm bất kỳ chi phí nào.</p>}{expenses.map(expense => <article key={expense.id}><ReceiptText size={19} /><div><strong>{expense.title}</strong><small>{nameOf(expense.payerId)}{expense.date ? ` · ${expense.date.split('-').reverse().join('/')}` : ''} · {expense.splitWith.length ? `Chia cho ${expense.splitWith.length} người` : 'Không chia sẻ'}</small></div><strong>{money(expense.amount)}</strong>{editable && <><button type="button" aria-label={`Sửa chi phí ${expense.title}`} onClick={() => openExpense(expense)}><Pencil size={17} /></button><button type="button" aria-label={`Xóa chi phí ${expense.title}`} onClick={() => onChange('expenses', expenses.filter(item => item.id !== expense.id))}><Trash2 size={17} /></button></>}</article>)}</section>
    {modal === 'expense' && <ExpenseDialog expense={editingExpense} participants={participants} currentUserId={String(currentUserId || owner.id)} stops={plan.items || []} onSave={saveExpense} onClose={close} />}
    {modal === 'budget' && <PlanDialog title="Chỉnh sửa ngân sách" onClose={close}><form onSubmit={event => { event.preventDefault(); onChange('budget', settings.budget); onChange('travelerCount', settings.travelerCount); close(); }}><label>Ngân sách mục tiêu (VNĐ)<input autoFocus required type="number" min={0} max={999999999999} step={1} value={settings.budget} placeholder="Nhập ngân sách cả chuyến đi" onChange={event => setSettings({ ...settings, budget: event.target.value })} /></label><label>Số người đi<input required type="number" min={Math.max(1, participants.length)} max={10000} step={1} value={settings.travelerCount} onChange={event => setSettings({ ...settings, travelerCount: event.target.value })} /></label><footer><button type="submit" className="btn btn-primary">Lưu</button></footer></form></PlanDialog>}
    {modal === 'members' && <PlanDialog title="Bạn cùng lập kế hoạch" onClose={close}>{children}<footer><button type="button" className="btn btn-primary" onClick={close}>Xong</button></footer></PlanDialog>}
    {modal === 'balances' && <PlanDialog title="Số dư nhóm" onClose={close}><div className="trip-expense-balances">{balances.length ? balances.map(balance => <div key={balance.id}><strong>{nameOf(balance.id)}</strong><span>{balance.amount > 0 ? `Cần nhận ${money(balance.amount)}` : balance.amount < 0 ? `Cần trả ${money(-balance.amount)}` : 'Đã cân bằng'}</span></div>) : <p>Chưa có chi phí được chia sẻ để tính số dư nhóm.</p>}<small>Số dư tính từ người trả và những người cùng chia từng khoản chi. Khoản chưa rõ người trả chưa được tính.</small></div></PlanDialog>}
  </section>;
}
