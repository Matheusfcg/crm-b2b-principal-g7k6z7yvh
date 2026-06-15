export const sharedCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type, instance, instance_id, accept',
}

export const getCorsHeaders = (origin: string | null) => {
  const allowOrigin = origin || '*'
  return { ...sharedCorsHeaders, 'Access-Control-Allow-Origin': allowOrigin }
}
