export const error = (status: number, message: string | object) => new Response(JSON.stringify({ error: message }), { status, headers: { 'content-type': 'application/json' } })

export const successObject = (object: object) => new Response(JSON.stringify(object), { status: 200, headers: { 'content-type': 'application/json' } })
