// SARVIO Supabase adapter. Browser-safe publishable key only; permissions are enforced by RLS.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = 'https://qajxyqrzjzhcpdinqoya.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Iue4IGcLDynNlhafuajS6Q_lp6MTMER';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const keys={products:'sarvio_products_v1',categories:'sarvio_categories_v1',orders:'sarvio_orders_v1',promotions:'sarvio_promotions_v1'};
const localSet=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const localRead=(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch{return d}};
let currentUser=null, adminUid=null;
function errorOut(error){if(!error)return;const e=new Error(error.message||'Supabase request failed');e.code=error.code;throw e;}
async function isAdmin(user=currentUser){if(!user)return false;const {data,error}=await supabase.rpc('sarvio_is_admin');if(error)return false;return data===true;}
async function loadType(type){const {data,error}=await supabase.from('sarvio_store_items').select('id,payload').eq('kind',type);if(error)throw error;return (data||[]).map(r=>type==='categories'?r.payload.name:r.payload);}
async function loadCloud(){
  try{const p=await loadType('products');if(p.length)localSet(keys.products,p)}catch(e){console.warn('Supabase products load failed; keeping local cache.',e)}
  try{const c=await loadType('categories');if(c.length)localSet(keys.categories,c)}catch(e){console.warn('Supabase categories load failed; keeping local cache.',e)}
  try{const {data,error}=await supabase.from('sarvio_settings').select('payload').eq('key','promotions').maybeSingle();if(error)throw error;if(data?.payload)localSet(keys.promotions,data.payload)}catch(e){console.warn('Supabase promotions load failed; keeping local cache.',e)}
  if(await isAdmin()){try{localSet(keys.orders,await loadType('orders'))}catch(e){console.warn('Supabase orders load failed.',e)}}
}
async function save(key,value){
 const kind=key===keys.products?'products':key===keys.categories?'categories':key===keys.orders?'orders':key===keys.promotions?'promotions':null;if(!kind)return;
 if(kind==='promotions'){
   if(!(await isAdmin()))throw new Error('Only an authorized admin can change banners.');
   const {error}=await supabase.from('sarvio_settings').upsert({key:'promotions',payload:value,updated_at:new Date().toISOString()});errorOut(error);return;
 }
 if(kind!=='orders' && !(await isAdmin()))return;
 if(kind==='orders' && !(await isAdmin())){
   // Customers may submit new orders only; they cannot edit existing order IDs.
   const {data:existing,error:checkErr}=await supabase.from('sarvio_store_items').select('id').eq('kind','orders').in('id',(value||[]).map(x=>String(x.id)));
   if(checkErr)throw checkErr;const existingIds=new Set((existing||[]).map(x=>x.id));
   for(const item of value||[]){if(existingIds.has(String(item.id)))continue;const {error}=await supabase.from('sarvio_store_items').insert({kind:'orders',id:String(item.id),payload:item});if(error)console.warn('Order cloud insert failed:',error)}return;
 }
 const rows=(value||[]).map(item=>({kind,id:kind==='categories'?String(item):String(item.id),payload:kind==='categories'?{name:item}:item,updated_at:new Date().toISOString()}));
 const {error:upsertError}=rows.length?await supabase.from('sarvio_store_items').upsert(rows,{onConflict:'kind,id'}):{error:null};errorOut(upsertError);
 const {data:existing,error:readError}=await supabase.from('sarvio_store_items').select('id').eq('kind',kind);errorOut(readError);
 const keep=new Set(rows.map(r=>r.id));const remove=(existing||[]).map(r=>r.id).filter(id=>!keep.has(id));
 if(remove.length){const {error}=await supabase.from('sarvio_store_items').delete().eq('kind',kind).in('id',remove);errorOut(error)}
}
async function registerCustomer({name,email,password,phone=''}){
 const {data,error}=await supabase.auth.signUp({email,password,options:{data:{name,phone}}});errorOut(error);if(!data.user)throw new Error('Account created. Check your email to confirm your account before logging in.');
 const {error:profileError}=await supabase.from('sarvio_profiles').upsert({user_id:data.user.id,name:String(name||'').trim(),email:String(email||'').trim().toLowerCase(),phone:String(phone||'').trim()});if(profileError)console.warn('Profile save failed:',profileError);return data.user;
}
async function signInCustomer(email,password){const {data,error}=await supabase.auth.signInWithPassword({email,password});errorOut(error);if(await isAdmin(data.user)){await supabase.auth.signOut();throw new Error('Please use the separate admin page to sign in as administrator.')}return data.user}
async function signIn(email,password){const {data,error}=await supabase.auth.signInWithPassword({email,password});errorOut(error);currentUser=data.user;if(!(await isAdmin(data.user))){await supabase.auth.signOut();currentUser=null;throw new Error('This account is not authorized as SARVIO admin. Add its user ID to the admin_users table using the setup instructions.')}adminUid=data.user.id;try{await loadCloud()}catch(e){console.warn('Signed in but data refresh failed',e)}return data.user}
async function signOut(){await supabase.auth.signOut();currentUser=null;adminUid=null}
supabase.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;window.dispatchEvent(new CustomEvent('sarvio-supabase-auth',{detail:currentUser}));});
async function getSavedAddresses(){const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Please log in to use saved addresses.');const {data,error}=await supabase.from('sarvio_addresses').select('id,label,address,is_default,created_at').eq('user_id',user.id).order('created_at',{ascending:true});errorOut(error);return data||[];}
async function saveAddress({id=null,label='Home',address,is_default=false}){const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Please log in to save addresses.');const existing=await getSavedAddresses();if(!id && existing.length>=3)throw new Error('You can save up to 3 addresses. Edit or replace an existing address.');if(is_default){const {error}=await supabase.from('sarvio_addresses').update({is_default:false}).eq('user_id',user.id);errorOut(error)}const row={user_id:user.id,label,address,is_default};if(id)row.id=id;const {data,error}=await supabase.from('sarvio_addresses').upsert(row).select('id,label,address,is_default').single();errorOut(error);return data;}
async function createCustomerOrder(order){const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Please log in before placing an order.');order.user_id=user.id;const {error}=await supabase.from('sarvio_store_items').insert({kind:'orders',id:String(order.id),payload:order,updated_at:new Date().toISOString()});errorOut(error);return order;}
window.sarvioCloud={uid:null,signIn,registerCustomer,signInCustomer,signOut,customerSignOut:signOut,onAuthStateChanged(callback){let alive=true;supabase.auth.getSession().then(({data})=>{if(alive)callback(data.session?.user||null)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>callback(session?.user||null));return()=>{alive=false;subscription.unsubscribe()}},save,getSavedAddresses,saveAddress,createCustomerOrder,get currentUser(){return currentUser},get enabled(){return true},loadCloud};
loadCloud().finally(()=>window.dispatchEvent(new Event('sarvio-cloud-ready')));
