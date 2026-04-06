
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xubjtvfbizvjjnwveyqt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1Ymp0dmZiaXp2ampud3ZleXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDAwNzksImV4cCI6MjA4OTk3NjA3OX0.a36BsN5mkiGIFvC6RGIgC8FEqLgR1VZrbV7zuCmgTns'
);

async function test() {
  const { data, error } = await supabase.from('preview_posts').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total posts:', data.length);
    if (data.length > 0) {
      console.log('Last post structure:', JSON.stringify(data[data.length - 1], null, 2));
    }
  }
}

test();
